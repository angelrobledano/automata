import { Commerce, ChannelConnection } from '@prisma/client';
import { decrypt } from '../utils/crypto';
import { sendWhatsAppMessage, sendWhatsAppFormattedMessage } from './whatsapp';
import { FormattedMessage } from '../formatters/channel-formatter';

/**
 * Envía un mensaje de texto plano por el canal correspondiente (retrocompatible)
 */
export async function sendOmnichannelMessage(
  commerce: Commerce, 
  channelConnection: ChannelConnection,
  toIdentifier: string, 
  text: string
) {
  try {
    if (!channelConnection.accessToken) throw new Error('Credenciales no configuradas');
    
    const token = decrypt(channelConnection.accessToken); 
    const accountId = channelConnection.channelAccountId || channelConnection.channelPhoneId;

    if (!accountId) throw new Error('ID de cuenta no configurado en la conexión');

    switch (channelConnection.provider) {
      case 'META':
        if (channelConnection.channelPhoneId) {
          await sendWhatsAppMessage(accountId, token, toIdentifier, text);
        } else {
          await sendMetaGraphMessage(accountId, token, toIdentifier, text);
        }
        break;

      default:
        throw new Error(`Canal no soportado: ${channelConnection.provider}`);
    }
  } catch (error) {
    console.error(`[Omnichannel] Error enviando mensaje por ${channelConnection.provider}:`, error);
    throw error;
  }
}

/**
 * Envía un mensaje formateado (con botones, listas, etc.) por el canal correspondiente
 */
export async function sendOmnichannelFormattedMessage(
  commerce: Commerce, 
  channelConnection: ChannelConnection,
  toIdentifier: string, 
  formatted: FormattedMessage
) {
  try {
    if (!channelConnection.accessToken) throw new Error('Credenciales no configuradas');
    
    const token = decrypt(channelConnection.accessToken); 
    const accountId = channelConnection.channelAccountId || channelConnection.channelPhoneId;

    if (!accountId) throw new Error('ID de cuenta no configurado en la conexión');

    switch (channelConnection.provider) {
      case 'META':
        if (channelConnection.channelPhoneId) {
          // WhatsApp: soporta botones interactivos
          await sendWhatsAppFormattedMessage(accountId, token, toIdentifier, formatted);
        } else {
          // Messenger / Instagram: enviar como texto plano (por ahora)
          await sendMetaGraphMessage(accountId, token, toIdentifier, formatted.text);
        }
        break;

      default:
        throw new Error(`Canal no soportado: ${channelConnection.provider}`);
    }
  } catch (error) {
    console.error(`[Omnichannel] Error enviando mensaje formateado por ${channelConnection.provider}:`, error);
    throw error;
  }
}

/**
 * Función genérica para enviar mensajes por Messenger o Instagram Direct a través de la Graph API
 */
async function sendMetaGraphMessage(accountId: string, token: string, recipientId: string, text: string) {
  const url = `https://graph.facebook.com/v19.0/${accountId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: text },
      messaging_type: 'RESPONSE'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Fallo en Meta Graph API: ${data.error?.message || JSON.stringify(data)}`);
  }

  return data;
}
