import axios from 'axios';
import { FormattedMessage } from '../formatters/channel-formatter';
import { buildWhatsAppPayload, buildWhatsAppTextPayload } from '../formatters/whatsapp-formatter';

// Simple in-memory rate limiter per phone number (máx 50 msgs / sec)
const lastSendTimestamps: Record<string, number> = {};
const MIN_SEND_INTERVAL_MS = 20; // 20ms = 50 req/sec max

async function throttleOutgoing(phoneNumberId: string): Promise<void> {
  const now = Date.now();
  const lastSend = lastSendTimestamps[phoneNumberId] || 0;
  const elapsed = now - lastSend;
  if (elapsed < MIN_SEND_INTERVAL_MS) {
    await new Promise(res => setTimeout(res, MIN_SEND_INTERVAL_MS - elapsed));
  }
  lastSendTimestamps[phoneNumberId] = Date.now();
}

/**
 * Envía un mensaje de texto simple vía WhatsApp Business API
 */
export async function sendWhatsAppMessage(phoneNumberId: string, token: string, to: string, text: string) {
  try {
    await throttleOutgoing(phoneNumberId);
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const payload = buildWhatsAppTextPayload(to, text);

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[WhatsApp] Mensaje de texto enviado a ${to}`);
  } catch (error: any) {
    console.error(`[WhatsApp] Error enviando mensaje a ${to}:`, error.response?.data || error.message);
  }
}

/**
 * Envía un mensaje formateado (texto, botones interactivos o lista) vía WhatsApp Business API
 * Selecciona automáticamente el tipo de payload según el FormattedMessage
 */
export async function sendWhatsAppFormattedMessage(phoneNumberId: string, token: string, to: string, formatted: FormattedMessage) {
  try {
    await throttleOutgoing(phoneNumberId);
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const payload = buildWhatsAppPayload(to, formatted);

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const msgType = formatted.buttons.length > 0 ? 'interactivo (botones)' : 'texto';
    console.log(`[WhatsApp] Mensaje ${msgType} enviado a ${to}`);
  } catch (error: any) {
    // Fallback: si el mensaje interactivo falla (ej: cuenta no verificada), enviar como texto plano
    if (formatted.buttons.length > 0) {
      console.warn(`[WhatsApp] Fallback a texto plano para ${to} (error en interactivo):`, error.response?.data?.error?.message || error.message);
      await sendWhatsAppMessage(phoneNumberId, token, to, formatted.text);
    } else {
      console.error(`[WhatsApp] Error enviando mensaje a ${to}:`, error.response?.data || error.message);
    }
  }
}
