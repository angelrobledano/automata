"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveMessage = exports.verifyWebhook = void 0;
const queue_1 = require("../queue");
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
// Verificación del Webhook de Meta
const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    // En producción, este token debería venir de variables de entorno
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'test_token';
    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        }
        else {
            res.sendStatus(403);
        }
    }
    else {
        res.sendStatus(400);
    }
};
exports.verifyWebhook = verifyWebhook;
// Rate limiter helper para webhooks (máx 15 mensajes por minuto por usuario)
async function isRateLimited(senderId) {
    const key = `rate_limit:${senderId}`;
    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, 60);
    }
    return current > 15;
}
// Recepción de mensajes de WhatsApp
const receiveMessage = async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            res.status(200).send('EVENT_RECEIVED');
            if (body.entry?.[0]?.changes?.[0]?.value?.messages) {
                const payload = body.entry[0].changes[0].value;
                const msg = payload.messages[0];
                const senderId = msg.from;
                if (await isRateLimited(senderId)) {
                    console.warn(`[RateLimit] Bloqueado usuario ${senderId} por spam.`);
                    return;
                }
                // Truncate to max 2000 chars to avoid prompt overflow attacks
                let text = msg.text?.body || '';
                if (text.length > 2000)
                    text = text.substring(0, 2000) + '...';
                // Normalizamos
                const normalizedPayload = {
                    channel: 'WHATSAPP',
                    receiverId: payload.metadata.phone_number_id,
                    senderId,
                    text,
                    originalPayload: payload
                };
                await (0, queue_1.enqueueMetaMessage)(normalizedPayload);
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
                    if (await isRateLimited(senderId)) {
                        console.warn(`[RateLimit] Bloqueado usuario ${senderId} por spam en ${channel}.`);
                        return;
                    }
                    let text = messagingEvent.message.text || '';
                    if (text.length > 2000)
                        text = text.substring(0, 2000) + '...';
                    const normalizedPayload = {
                        channel,
                        receiverId: body.entry[0].id, // El ID de la Página o cuenta IG
                        senderId,
                        text,
                        originalPayload: messagingEvent
                    };
                    await (0, queue_1.enqueueMetaMessage)(normalizedPayload);
                }
            }
        }
        else {
            res.sendStatus(404);
        }
    }
    catch (error) {
        console.error('Error procesando webhook de Meta:', error);
        // CRÍTICO: Si falla Redis/BullMQ (enqueueMetaMessage), lanzamos 500
        // para que Meta NO borre el mensaje de sus servidores y reintente más tarde.
        res.sendStatus(500);
    }
};
exports.receiveMessage = receiveMessage;
//# sourceMappingURL=meta.js.map