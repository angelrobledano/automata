/**
 * Procesador del job de mensaje entrante (extraído de worker.ts para poder testearlo
 * sin instanciar un Worker real de BullMQ contra Redis).
 *
 * NOTA: la lógica es una extracción 1:1 del handler original. Los fixes de
 * reintentos/entrega se aplican en commits posteriores con tests que los cubren.
 */
import 'dotenv/config';
import type { Job } from 'bullmq';
import type IORedis from 'ioredis';
import { prisma } from './db/prisma';
import { getOrCreateSession, getSessionMessages, addMessageToSession } from './db/session';
import { generateAIResponse } from './ai';
import { sendOmnichannelMessage, sendOmnichannelFormattedMessage } from './integrations/omnichannel';
import { formatForChannel, ChannelType } from './formatters/channel-formatter';
import * as Sentry from '@sentry/node';
import { performance } from 'perf_hooks';
import { sanitizePII } from './utils/pii';
import { createEmbedding, searchSimilarChunks } from './rag/index';
import { getBusinessStatus, type WeeklySchedule } from './utils/businessHours';
import { detectIntentAndContext } from './rag/knowledge-resolver';
import { FeatureGuard } from './billing/core/FeatureGuard';
import crypto from 'crypto';

export async function processMetaJob(job: Job, connection: IORedis) {
  console.log(`[Worker] Procesando job ${job.id}`);
  const payload = job.data;

  const { channel, receiverId, senderId, text, originalPayload } = payload;
  let session: any = null;
  let commerceId = ''; // necesario para publicar eventos con sala correcta incluso en el catch

  return Sentry.startSpan({
    op: "process-message",
    name: `Message Process - Commerce Channel: ${receiverId || 'unknown'}`,
  }, async () => {
    // Inyectar contexto en Sentry
    Sentry.setUser({ id: senderId });
    Sentry.setTag("channel", channel);

    const startTime = performance.now();

    try {
      const cleanText = sanitizePII(text || '');

      // SRE: Idempotencia estricta usando Redis SETNX para evitar compras dobles por Webhooks repetidos.
      // IMPORTANTE: solo en el PRIMER intento del job. Si filtráramos también los reintentos,
      // un fallo transitorio (ej. OpenAI caída) descartaría el mensaje en el reintento
      // y el cliente nunca recibiría respuesta (el job terminaría "completado").
      // La protección contra duplicados reales vive en el webhook (idempotency middleware).
      const messageId = originalPayload?.messages?.[0]?.id || originalPayload?.id || originalPayload?.message?.mid;
      if (messageId && job.attemptsMade === 0) {
        const isNew = await connection.set(`processed_msg:${messageId}`, '1', 'EX', 86400, 'NX');
        if (!isNew) {
          console.warn(`[Worker] Mensaje duplicado detectado y descartado silenciosamente: ${messageId}`);
          return;
        }
      }

      // Buscamos a qué conexión de canal pertenece este identificador
      let channelConnection = null;

      if (channel === 'WHATSAPP') {
        channelConnection = await prisma.channelConnection.findFirst({ where: { channelPhoneId: receiverId, provider: 'META' }, include: { commerce: true } });
      } else if (channel === 'INSTAGRAM') {
        channelConnection = await prisma.channelConnection.findFirst({ where: { channelAccountId: receiverId, provider: 'META' }, include: { commerce: true } });
      } else if (channel === 'MESSENGER') {
        channelConnection = await prisma.channelConnection.findFirst({ where: { channelAccountId: receiverId, provider: 'META' }, include: { commerce: true } });
      }

      if (!channelConnection) {
        console.error(`[Worker] No se encontró channel connection para el receiverId: ${receiverId} en el canal ${channel}`);
        return;
      }
      const commerce = channelConnection.commerce;
      commerceId = commerce.id;
      Sentry.setTag("commerceId", commerce.id);

      const customerIdentifier = senderId;
      const maskedText = cleanText.length > 8 ? `${cleanText.substring(0, 4)}*** (L: ${cleanText.length})` : '***';
      console.log(`[Worker] [${channel}] Mensaje recibido de ${customerIdentifier} para ${commerce.name}: ${maskedText}`);

      // 1. Manejo de Sesión Omnicanal
      session = await getOrCreateSession(commerce.id, customerIdentifier, channelConnection.id);

      // 2. Guardamos el mensaje del usuario (SOLO en el primer intento para evitar duplicados en reintentos)
      if (job.attemptsMade === 0) {
        await addMessageToSession(session.id, 'user', cleanText);
        connection.publish('chat_updates', JSON.stringify({ commerceId, sessionId: session.id, message: { role: 'user', content: cleanText, createdAt: new Date().toISOString() } }));
      }

      // 2b. DETECCIÓN DE SOLICITUD EXPLÍCITA DE ATENCIÓN HUMANA
      const lowerText = cleanText.toLowerCase();
      if (lowerText.includes('hablar con una persona') || lowerText.includes('agente humano') || lowerText.includes('operador') || lowerText.includes('hablar con alguien')) {
        console.log(`[Worker] Detección de solicitud explícita de atención humana en sesión ${session.id}`);
        await prisma.session.update({
          where: { id: session.id },
          data: {
            status: 'HUMAN_REQUIRED',
            controlBy: 'HUMAN',
            humanReason: 'Cliente solicita hablar con una persona.',
            waitingSince: session.waitingSince || new Date(),
            aiSummary: {
              intent: 'HUMAN_REQUEST',
              reason: 'El cliente solicitó explícitamente ser atendido por una persona.',
              relevantData: `Último mensaje recibido: "${cleanText}"`
            },
            suggestedReply: 'Hola, un agente humano tomará tu consulta de inmediato. ¿En qué te podemos ayudar?'
          }
        });
        return;
      }

      // GESTIÓN DE TIMEOUT Y CONTROL HUMANO
      if (session.status === 'HUMAN_ACTIVE' || session.status === 'HUMAN_REQUIRED' || session.controlBy === 'HUMAN') {
        // Si la sesión lleva más de 24 horas en espera sin respuesta humana, se reactiva automáticamente para la IA
        const isStale = session.waitingSince && (Date.now() - new Date(session.waitingSince).getTime() > 24 * 60 * 60 * 1000);
        if (isStale) {
          console.log(`[Worker] Sesión ${session.id} desatendida por más de 24h. Autoresolviendo y reactivando la IA.`);
          session = await prisma.session.update({
            where: { id: session.id },
            data: { status: 'AI_ACTIVE', controlBy: 'AI', waitingSince: null, humanReason: null }
          });
        } else {
          console.log(`[Worker] Sesión ${session.id} bajo control/espera humana (status: ${session.status}). IA pausada.`);
          if (session.status === 'HUMAN_REQUIRED' && !session.waitingSince) {
            await prisma.session.update({ where: { id: session.id }, data: { waitingSince: new Date() } });
          }
          return;
        }
      }

      // CHECK BUDGET via FeatureGuard
      const featureCheck = await FeatureGuard.canExecute(commerce.id, 'conversations', 1);

      if (!featureCheck.allowed) {
        console.warn(`[Worker] Commerce ${commerce.id} excedió límite/presupuesto. Razón: ${featureCheck.reason}`);
        const budgetMsg = "Lo siento, nuestro sistema se encuentra en mantenimiento temporal. Por favor, contacta con la tienda por otro medio.";
        await addMessageToSession(session.id, 'assistant', budgetMsg);
        await sendOmnichannelMessage(commerce, channelConnection, customerIdentifier, budgetMsg);
        return;
      }

      // 3. Obtenemos el historial completo para darle contexto al LLM
      const rawHistory = await getSessionMessages(session.id);
      // TRUNCATE HISTORY to last 15 messages to save tokens and prevent context overflow
      const recentHistory = rawHistory.slice(-15);
      const messageHistory = recentHistory.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      // Semantic Caching & RAG Vectorization: Generar embedding una sola vez
      const todayStr = new Date().toISOString().split('T')[0];
      const cacheQueryText = `[Fecha: ${todayStr}] ${cleanText}`;
      // B-15: el hash incluye el commerceId (sin colisiones entre comercios)
      const queryHash = crypto.createHash('sha256').update(`${commerceId}|${cacheQueryText}`).digest('hex');
      // B-15: los mensajes con intención de pedido NUNCA usan caché semántica
      // (una respuesta cacheada "tu pedido #1234 está registrado" crearía un
      // pedido fantasma en un cliente distinto).
      const { intent } = detectIntentAndContext(cleanText);
      const cacheAllowed = intent !== 'ORDER';

      const queryEmbedding = await Sentry.startSpan({ op: 'create-embedding', name: 'Vectorizing user text' }, () =>
        createEmbedding(cacheQueryText)
      );

      // 4. RAG: Recuperamos conocimiento basándonos en el texto y reutilizamos el embedding
      const similarChunks = await Sentry.startSpan({ op: 'rag-retrieval', name: 'Querying vector chunks' }, () =>
        searchSimilarChunks(commerce.id, cleanText, 3, queryEmbedding)
      );

      const knowledgeContext = similarChunks.map((c: any) => `[Fuente: ${c.sourcename || 'Desconocida'}]\n${c.content}`).join('\n\n');

      const businessStatus = getBusinessStatus(commerce.businessHours as WeeklySchedule | string | null | undefined);
      let outOfHoursDirectives = '';
      if (!businessStatus.isOpen && businessStatus.nextOpeningText) {
        outOfHoursDirectives = `
ESTADO ACTUAL DEL COMERCIO: CERRADO.
Próxima apertura prevista: ${businessStatus.nextOpeningText}.
INSTRUCCIONES PARA ATENCIÓN FUERA DE HORARIO:
- Atiende con amabilidad cualquier consulta informativa sobre el catálogo o la tienda.
- Si el cliente solicita realizar un encargo o pedido, infórmale con cortesía de que el local está cerrado pero que puedes dejar su pedido registrado para prepararlo tan pronto abran (${businessStatus.nextOpeningText}).
- Indícale que, en caso de haber alguna incidencia de stock o disponibilidad, el equipo se pondrá en contacto con él al abrir.
- Si el cliente acepta, toma los datos del encargo y confírmalo con normalidad.
`;
      }

      // Construimos un system prompt extendido garantizando Cero Alucinaciones
      const ragPrompt = `
${commerce.systemPrompt}
${outOfHoursDirectives}

INFORMACIÓN DE LA BASE DE CONOCIMIENTO (SOLO PUEDES USAR ESTA INFORMACIÓN):
${knowledgeContext || 'No hay información adicional disponible.'}

REGLA ESTRICTA DE SEGURIDAD: Eres un asistente exclusivo de esta tienda. BAJO NINGÚN CONCEPTO debes responder a preguntas de cultura general, matemáticas, programación, historia, curiosidades u otros temas que no estén estrictamente relacionados con los productos, horarios, o servicios de la tienda. Si el usuario hace una pregunta fuera de esta temática, o si la información no está en el contexto, responde amablemente diciendo que solo puedes ayudar con temas relacionados con la tienda y sus productos, y no inventes datos.
        `.trim();

      // Distancia < 0.05 significa > 0.95 similitud
      const cachedResponses = cacheAllowed ? await Sentry.startSpan({ op: 'semantic-cache-lookup', name: 'Semantic Cache Lookup' }, () =>
        prisma.$queryRaw<Array<{ response: string }>>`
          SELECT response
          FROM "SemanticCache"
          WHERE "commerceId" = ${commerce.id}
            AND (embedding <=> ${queryEmbedding}::vector) < 0.05
          ORDER BY embedding <=> ${queryEmbedding}::vector ASC
          LIMIT 1
        `
      ) : [];

      let aiResponse = '';
      let isCacheHit = false;

      if (cachedResponses.length > 0 && cachedResponses[0]) {
        aiResponse = cachedResponses[0].response;
        isCacheHit = true;
        console.log(`[Worker] Semantic Cache HIT para: ${cleanText.substring(0, 20)}...`);
      } else {
        // 5. Llamamos a OpenAI inyectando el prompt enriquecido
        try {
          aiResponse = await Sentry.startSpan({ op: 'openai-response-generation', name: 'Generating LLM text' }, () =>
            generateAIResponse({ ...commerce, systemPrompt: ragPrompt }, customerIdentifier, messageHistory, session.id)
          );

          // Guardar en Semantic Cache (solo si está permitido para este intent)
          if (cacheAllowed) {
            await prisma.$executeRaw`
              INSERT INTO "SemanticCache" (id, "commerceId", "queryHash", embedding, response, "createdAt")
              VALUES (${crypto.randomUUID()}, ${commerce.id}, ${queryHash}, ${queryEmbedding}::vector, ${aiResponse}, NOW())
              ON CONFLICT ("queryHash") DO NOTHING
            `;
          }
        } catch (err) {
          throw err;
        }
      }

      // 5. Formateamos la respuesta según el canal y enviamos al cliente final.
      // IMPORTANTE: enviar ANTES de persistir. Si el envío falla, se lanza el error
      // (BullMQ reintenta) y la BD no registra como enviado un mensaje que nunca llegó.
      const channelType: ChannelType = (channel === 'WHATSAPP' || channel === 'INSTAGRAM' || channel === 'MESSENGER') ? channel : 'WHATSAPP';
      const formattedMsg = formatForChannel(aiResponse, channelType);
      await sendOmnichannelFormattedMessage(commerce, channelConnection, customerIdentifier, formattedMsg);

      // 6. Guardamos la respuesta generada solo si se entregó con éxito
      await addMessageToSession(session.id, 'assistant', aiResponse);
      connection.publish('chat_updates', JSON.stringify({ commerceId, sessionId: session.id, message: { role: 'assistant', content: aiResponse, createdAt: new Date().toISOString() } }));

      // 7. Descontar del presupuesto mediante FeatureGuard
      const estimatedTokens = Math.floor((ragPrompt.length + aiResponse.length) / 4);

      await FeatureGuard.trackConsumption(commerce.id, 'openai_tokens', estimatedTokens);
      await FeatureGuard.trackConsumption(commerce.id, 'conversations', 1);

      const totalDuration = performance.now() - startTime;
      console.log(`[APM] [${channel}] Job ${job.id} procesado correctamente en ${totalDuration.toFixed(2)}ms. Tokens estimados: ${estimatedTokens}. CacheHit: ${isCacheHit}`);
    } catch (error) {
      Sentry.captureException(error);

      const maxAttempts = job.opts.attempts || 3;
      if (job.attemptsMade >= maxAttempts - 1) {
        console.error(`[Worker] Fallo definitivo tras ${maxAttempts} intentos en job ${job.id}. Transfiriendo a humano.`);

        // Cambiar estado a HUMAN_REQUESTED
        if (session) {
          await prisma.session.update({
            where: { id: session.id },
            data: { status: 'HUMAN_REQUESTED' }
          });
        }

        const systemMessage = "⚠️ Error crítico de conexión con IA. Asistencia humana requerida. El cliente no ha recibido respuesta.";
        if (session) {
          await addMessageToSession(session.id, 'system', systemMessage);
          if (commerceId) {
            connection.publish('chat_updates', JSON.stringify({ commerceId, sessionId: session.id, message: { role: 'system', content: systemMessage, createdAt: new Date().toISOString() } }));
          }
        }

        throw new Error('Fallo absoluto de IA tras reintentos. Sesión escalada a humano.');
      } else {
        console.warn(`[Worker] Fallo en intento ${job.attemptsMade + 1}. Reintentando job ${job.id}...`);
        throw error; // Lanzamos para que BullMQ reintente
      }
    }
  });
}
