import { Request, Response } from 'express';
import { enqueueMetaMessage } from '../queue';
import { isRateLimited } from '../utils/rateLimit';
import { checkIdempotency } from './middleware/idempotency';
import crypto from 'crypto';

// Verificación del Webhook de Meta (GET /api/webhooks/meta)
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // B-09: fail-closed. Sin META_VERIFY_TOKEN no hay forma de verificar — no se acepta nada.
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  if (!VERIFY_TOKEN) {
    console.error('[Security] META_VERIFY_TOKEN no configurado: verificación de webhook rechazada.');
    res.sendStatus(500);
    return;
  }

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

/**
 * B-09: validación de firma HMAC fail-closed.
 * - Sin META_APP_SECRET => rechazar (antes aceptaba todo).
 * - Requiere rawBody capturado por express.json({ verify }) (index.ts):
 *   la firma de Meta se calcula sobre los bytes EXACTOS del body; re-serializar
 *   JSON.stringify(req.body) puede no coincidir.
 * - Comparación en tiempo constante.
 */
export const validateMetaSignature = (req: Request): boolean => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    console.error('[Security] META_APP_SECRET no configurado: webhook rechazado (fail-closed).');
    return false;
  }

  if (!signature) {
    console.warn('[Security] Webhook rechazado: falta cabecera x-hub-signature-256');
    return false;
  }

  try {
    const rawBody = (req as any).rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      console.error('[Security] Webhook rechazado: rawBody no capturado (middleware verify ausente).');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest();

    const provided = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');

    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(provided, expected);
  } catch (err) {
    console.error('[Security] Error calculando firma HMAC:', err);
    return false;
  }
};

// Rate limiter configuration
const RATE_LIMIT_MESSAGES = 15;
const RATE_LIMIT_WINDOW_SEC = 60;

/**
 * Procesa un mensaje individual ya validado: idempotencia -> rate limit -> cola.
 * Devuelve false si el mensaje se descartó (duplicado / rate limited).
 */
async function handleInboundMessage(
  channel: 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER',
  messageId: string,
  senderId: string,
  receiverId: string,
  text: string,
  originalPayload: unknown
): Promise<boolean> {
  // Verificación de Idempotencia (protección contra reintentos de Meta)
  if (!(await checkIdempotency(messageId))) {
    console.log(`[Idempotency] Mensaje duplicado de ${channel} descartado: ${messageId}`);
    return false;
  }

  if (await isRateLimited(senderId, RATE_LIMIT_MESSAGES, RATE_LIMIT_WINDOW_SEC)) {
    console.warn(`[RateLimit] Bloqueado usuario ${senderId} por spam en ${channel}.`);
    return false;
  }

  // Truncate to max 2000 chars to avoid prompt overflow attacks
  if (text.length > 2000) text = text.substring(0, 2000) + '...';

  const normalizedPayload = { channel, receiverId, senderId, text, originalPayload };
  await enqueueMetaMessage(normalizedPayload);
  return true;
}

// Recepción de mensajes de WhatsApp
export const receiveMessage = async (req: Request, res: Response) => {
  try {
    if (!validateMetaSignature(req)) {
      return res.status(401).send('Firma no válida');
    }

    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const value = body.entry?.[0]?.changes?.[0]?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const receiverId = value.metadata?.phone_number_id || body.entry[0].id;

        // Procesar TODOS los mensajes del payload (antes solo el primero)
        for (const msg of messages) {
          const senderId = msg.from;
          console.log(`[Webhook] Mensaje entrante de WA ${msg.id} de: ${senderId}`);
          await handleInboundMessage(
            'WHATSAPP',
            msg.id,
            senderId,
            receiverId,
            msg.text?.body || '',
            value
          );
        }
      }

      // 200 DESPUÉS de encolar: si la cola falla, devolvemos 500 y Meta reintenta.
      // (El 200 prematuro perdía el mensaje para siempre; la idempotencia ya
      // protege contra duplicados en el reintento.)
      res.status(200).send('EVENT_RECEIVED');
    }
    else if (body.object === 'page' || body.object === 'instagram') {
      const messagingEvents = body.entry?.[0]?.messaging;

      if (messagingEvents && messagingEvents.length > 0) {
        const isInstagram = body.object === 'instagram' || body.entry[0].id.toString().length > 15; // Heurística simple
        const channel = isInstagram ? 'INSTAGRAM' : 'MESSENGER';

        for (const messagingEvent of messagingEvents) {
          if (messagingEvent.message && !messagingEvent.message.is_echo) {
            await handleInboundMessage(
              channel,
              messagingEvent.message.mid,
              messagingEvent.sender.id,
              body.entry[0].id, // El ID de la Página o cuenta IG
              messagingEvent.message.text || '',
              messagingEvent
            );
          }
        }
      }

      res.status(200).send('EVENT_RECEIVED');
    }
    else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando webhook de Meta:', error);
    // Si falla Redis/BullMQ (enqueueMetaMessage), 500 para que Meta reintente.
    // La idempotencia evita dobles procesados en el reintento.
    res.sendStatus(500);
  }
};
