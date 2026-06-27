import { Request, Response } from 'express';
import { enqueueMetaMessage } from '../queue';
import { isRateLimited } from '../utils/rateLimit';
import { checkIdempotency } from './middleware/idempotency';

// Verificación del Webhook de Meta
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // En producción, este token debería venir de variables de entorno
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'test_token';

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

// Rate limiter configuration
const RATE_LIMIT_MESSAGES = 15;
const RATE_LIMIT_WINDOW_SEC = 60;

// Recepción de mensajes de WhatsApp
export const receiveMessage = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      res.status(200).send('EVENT_RECEIVED');
      if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
        const payload = body.entry[0].changes[0].value;
        const msg = payload.messages[0];
        
        const senderId = msg.from;
        console.log(`[Webhook] Mensaje entrante de WA recibido de: ${senderId}`);
        
        // Verificación de Idempotencia
        if (!(await checkIdempotency(msg.id))) {
          console.log(`[Idempotency] Mensaje duplicado de WhatsApp descartado: ${msg.id}`);
          return;
        }

        if (await isRateLimited(senderId, RATE_LIMIT_MESSAGES, RATE_LIMIT_WINDOW_SEC)) {
          console.warn(`[RateLimit] Bloqueado usuario ${senderId} por spam.`);
          return;
        }

        // Truncate to max 2000 chars to avoid prompt overflow attacks
        let text = msg.text?.body || '';
        if (text.length > 2000) text = text.substring(0, 2000) + '...';

        // Normalizamos
        const receiverId = payload.metadata?.phone_number_id || body.entry[0].id;
        console.log(`[Webhook] Payload recibido:`, JSON.stringify(payload, null, 2));

        const normalizedPayload = {
          channel: 'WHATSAPP',
          receiverId,
          senderId,
          text,
          originalPayload: payload
        };
        await enqueueMetaMessage(normalizedPayload);
      }
    } 
    else if (body.object === 'page' || body.object === 'instagram') {
      res.status(200).send('EVENT_RECEIVED');
      if (body.entry?.[0]?.messaging) {
        const messagingEvent = body.entry[0].messaging[0];
        
        if (messagingEvent.message && !messagingEvent.message.is_echo) {
          const isInstagram = body.object === 'instagram' || body.entry[0].id.toString().length > 15; // Heurística simple
          const channel = isInstagram ? 'INSTAGRAM' : 'MESSENGER';
          
          const senderId = messagingEvent.sender.id;
          const messageId = messagingEvent.message.mid;

          // Verificación de Idempotencia
          if (!(await checkIdempotency(messageId))) {
            console.log(`[Idempotency] Mensaje duplicado de ${channel} descartado: ${messageId}`);
            return;
          }

          if (await isRateLimited(senderId, RATE_LIMIT_MESSAGES, RATE_LIMIT_WINDOW_SEC)) {
            console.warn(`[RateLimit] Bloqueado usuario ${senderId} por spam en ${channel}.`);
            return;
          }

          let text = messagingEvent.message.text || '';
          if (text.length > 2000) text = text.substring(0, 2000) + '...';

          const normalizedPayload = {
            channel,
            receiverId: body.entry[0].id, // El ID de la Página o cuenta IG
            senderId,
            text,
            originalPayload: messagingEvent
          };
          await enqueueMetaMessage(normalizedPayload);
        }
      }
    } 
    else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando webhook de Meta:', error);
    // CRÍTICO: Si falla Redis/BullMQ (enqueueMetaMessage), lanzamos 500
    // para que Meta NO borre el mensaje de sus servidores y reintente más tarde.
    res.sendStatus(500); 
  }
};
