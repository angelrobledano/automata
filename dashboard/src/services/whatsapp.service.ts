export class WhatsAppService {
  /**
   * Envia un mensaje de texto simple a través de la API Graph de Meta
   */
  static async sendTextMessage(
    phoneNumberId: string, 
    to: string, 
    text: string, 
    token: string
  ): Promise<boolean> {
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Meta API Error:', JSON.stringify(errorData));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }
}
