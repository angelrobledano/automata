import axios from 'axios';

// Función para enviar mensajes vía WhatsApp Business API
export async function sendWhatsAppMessage(phoneNumberId: string, token: string, to: string, text: string) {
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

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[WhatsApp] Mensaje enviado a ${to}`);
  } catch (error: any) {
    console.error(`[WhatsApp] Error enviando mensaje a ${to}:`, error.response?.data || error.message);
  }
}
