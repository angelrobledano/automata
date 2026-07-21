import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { prisma } from './db/prisma';
import { getOrCreateSession, getSessionMessages, addMessageToSession } from './db/session';
import { generateAIResponse } from './ai';
import { sendOmnichannelMessage } from './integrations/omnichannel';
import * as Sentry from '@sentry/node';
import { performance } from 'perf_hooks';

dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'meta-messages',
  async (job) => {
    console.log(`[Worker] Procesando job ${job.id}`);
    const payload = job.data;
    
    const { channel, receiverId, senderId, text, originalPayload } = payload;
    let session: any = null;

    return Sentry.startSpan({
      op: "process-message",
      name: `Message Process - Commerce Channel: ${receiverId || 'unknown'}`,
    }, async () => {
      // Inyectar contexto en Sentry
      Sentry.setUser({ id: senderId });
      Sentry.setTag("channel", channel);

      const startTime = performance.now();

      try {
        const { sanitizePII } = require('./utils/pii');
        const cleanText = sanitizePII(text || '');

        // SRE: Idempotencia estricta usando Redis SETNX para evitar compras dobles por Webhooks repetidos
        const messageId = originalPayload?.messages?.[0]?.id || originalPayload?.id || originalPayload?.message?.mid;
        if (messageId) {
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
        Sentry.setTag("commerceId", commerce.id);

        const customerIdentifier = senderId;
        const maskedText = cleanText.length > 8 ? `${cleanText.substring(0, 4)}*** (L: ${cleanText.length})` : '***';
        console.log(`[Worker] [${channel}] Mensaje recibido de ${customerIdentifier} para ${commerce.name}: ${maskedText}`);

        // 1. Manejo de Sesión Omnicanal
        session = await getOrCreateSession(commerce.id, customerIdentifier, channelConnection.id);

        // 2. Guardamos el mensaje del usuario (SOLO en el primer intento para evitar duplicados en reintentos)
        if (job.attemptsMade === 0) {
          await addMessageToSession(session.id, 'user', cleanText);
          connection.publish('chat_updates', JSON.stringify({ sessionId: session.id, message: { role: 'user', content: cleanText, createdAt: new Date().toISOString() } }));
        }

        // ABORTAR FLUJO DE IA SI ESTÁ EN CONTROL HUMANO
        if (session.status === 'HUMAN_CONTROL') {
          console.log(`[Worker] Sesión ${session.id} en control humano. IA omitida.`);
          return;
        }

        // CHECK BUDGET via FeatureGuard
        const { FeatureGuard } = require('./billing/core/FeatureGuard');
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

        // 4. RAG: Recuperamos conocimiento basado en el último mensaje del usuario
        const { searchSimilarChunks } = require('./rag/index');
        
        const similarChunks = await Sentry.startSpan({ op: 'rag-retrieval', name: 'Querying vector chunks' }, () =>
          searchSimilarChunks(commerce.id, cleanText, 3)
        );

        const knowledgeContext = similarChunks.map((c: any) => `[Fuente: ${c.sourcename || 'Desconocida'}]\n${c.content}`).join('\n\n');

        // Construimos un system prompt extendido garantizando Cero Alucinaciones
        const ragPrompt = `
${commerce.systemPrompt}

INFORMACIÓN DE LA BASE DE CONOCIMIENTO (SOLO PUEDES USAR ESTA INFORMACIÓN):
${knowledgeContext || 'No hay información adicional disponible.'}

REGLA ESTRICTA DE SEGURIDAD: Eres un asistente exclusivo de esta tienda. BAJO NINGÚN CONCEPTO debes responder a preguntas de cultura general, matemáticas, programación, historia, curiosidades u otros temas que no estén estrictamente relacionados con los productos, horarios, o servicios de la tienda. Si el usuario hace una pregunta fuera de esta temática, o si la información no está en el contexto, responde amablemente diciendo que solo puedes ayudar con temas relacionados con la tienda y sus productos, y no inventes datos.
        `.trim();

        // Semantic Caching: Buscamos si ya respondimos a esto
        const { createEmbedding } = require('./rag/index');
        const queryHash = require('crypto').createHash('sha256').update(cleanText).digest('hex');
        
        const queryEmbedding = await Sentry.startSpan({ op: 'create-embedding', name: 'Vectorizing user text' }, () =>
          createEmbedding(cleanText)
        );
        
        // Distancia < 0.05 significa > 0.95 similitud
        const cachedResponses = await Sentry.startSpan({ op: 'semantic-cache-lookup', name: 'Semantic Cache Lookup' }, () =>
          prisma.$queryRaw<Array<{ response: string }>>`
            SELECT response
            FROM "SemanticCache"
            WHERE "commerceId" = ${commerce.id}
              AND (embedding <=> ${queryEmbedding}::vector) < 0.05
            ORDER BY embedding <=> ${queryEmbedding}::vector ASC
            LIMIT 1
          `
        );

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
              generateAIResponse({ ...commerce, systemPrompt: ragPrompt }, customerIdentifier, messageHistory)
            );

            // Guardar en Semantic Cache
            await prisma.$executeRaw`
              INSERT INTO "SemanticCache" (id, "commerceId", "queryHash", embedding, response, "createdAt")
              VALUES (${require('crypto').randomUUID()}, ${commerce.id}, ${queryHash}, ${queryEmbedding}::vector, ${aiResponse}, NOW())
              ON CONFLICT ("queryHash") DO NOTHING
            `;
          } catch (err) {
            throw err;
          }
        }

        // 5. Guardamos la respuesta generada
        await addMessageToSession(session.id, 'assistant', aiResponse);
        connection.publish('chat_updates', JSON.stringify({ sessionId: session.id, message: { role: 'assistant', content: aiResponse, createdAt: new Date().toISOString() } }));

        // 6. Enviamos el mensaje al cliente final vía la red correspondiente
        await sendOmnichannelMessage(commerce, channelConnection, customerIdentifier, aiResponse);
        
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
            connection.publish('chat_updates', JSON.stringify({ sessionId: session.id, message: { role: 'system', content: systemMessage, createdAt: new Date().toISOString() } }));
          }
          
          throw new Error('Fallo absoluto de IA tras reintentos. Sesión escalada a humano.');
        } else {
          console.warn(`[Worker] Fallo en intento ${job.attemptsMade + 1}. Reintentando job ${job.id}...`);
          throw error; // Lanzamos para que BullMQ reintente
        }
      }
    });
  },
  { 
    // @ts-ignore
    connection,
    concurrency: 50 // SRE: Evitar cuello de botella bajo carga masiva
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job completado: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Error en el job ${job?.id}:`, err);
});

console.log('[Worker] Iniciado y escuchando colas...');
