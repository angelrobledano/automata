"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOmnichannelMessage = sendOmnichannelMessage;
const whatsapp_1 = require("./whatsapp");
async function sendOmnichannelMessage(commerce, channelConnection, toIdentifier, text) {
    try {
        if (!channelConnection.accessToken)
            throw new Error('Credenciales no configuradas');
        // Asumimos que los tokens están en texto plano por ahora (o se descifran si es necesario)
        const token = channelConnection.accessToken;
        const accountId = channelConnection.channelAccountId || channelConnection.channelPhoneId;
        if (!accountId)
            throw new Error('ID de cuenta no configurado en la conexión');
        switch (channelConnection.provider) {
            case 'META':
                // Determinar sub-canal (WA, Messenger, IG) por el origin o un campo, o mejor aún, si estamos refactorizando, 
                // pasamos el sub-canal o usamos Graph API genérico.
                // Por simplicidad, si channelPhoneId existe, asumimos WA:
                if (channelConnection.channelPhoneId) {
                    await (0, whatsapp_1.sendWhatsAppMessage)(accountId, token, toIdentifier, text);
                }
                else {
                    await sendMetaGraphMessage(accountId, token, toIdentifier, text);
                }
                break;
            default:
                throw new Error(`Canal no soportado: ${channelConnection.provider}`);
        }
    }
    catch (error) {
        console.error(`[Omnichannel] Error enviando mensaje por ${channelConnection.provider}:`, error);
        throw error;
    }
}
/**
 * Función genérica para enviar mensajes por Messenger o Instagram Direct a través de la Graph API
 */
async function sendMetaGraphMessage(accountId, token, recipientId, text) {
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
//# sourceMappingURL=omnichannel.js.map