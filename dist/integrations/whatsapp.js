"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = sendWhatsAppMessage;
const axios_1 = __importDefault(require("axios"));
// Función para enviar mensajes vía WhatsApp Business API
async function sendWhatsAppMessage(phoneNumberId, token, to, text) {
    try {
        const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: {
                preview_url: false,
                body: text,
            },
        };
        await axios_1.default.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`[WhatsApp] Mensaje enviado a ${to}`);
    }
    catch (error) {
        console.error(`[WhatsApp] Error enviando mensaje a ${to}:`, error.response?.data || error.message);
    }
}
//# sourceMappingURL=whatsapp.js.map