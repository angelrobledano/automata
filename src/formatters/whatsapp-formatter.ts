/**
 * WhatsApp Formatter — Formatea mensajes para WhatsApp Cloud API
 * 
 * Convierte markdown genérico a formato WhatsApp nativo y genera
 * payloads de Interactive Messages (botones y listas).
 */

import { FormattedMessage, MessageButton } from './channel-formatter';

/**
 * Convierte markdown genérico a formato WhatsApp nativo
 * **bold** → *bold*, __italic__ → _italic_
 */
export function markdownToWhatsApp(text: string): string {
  let result = text;
  // **bold** → *bold* (si alguien usa markdown doble)
  result = result.replace(/\*\*(.+?)\*\*/g, '*$1*');
  // __italic__ → _italic_
  result = result.replace(/__(.+?)__/g, '_$1_');
  // ~~strikethrough~~ → ~strikethrough~
  result = result.replace(/~~(.+?)~~/g, '~$1~');
  return result;
}

/**
 * Genera el payload para un mensaje de texto simple de WhatsApp
 */
export function buildWhatsAppTextPayload(to: string, text: string) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body: markdownToWhatsApp(text)
    }
  };
}

/**
 * Genera el payload para un mensaje interactivo con botones (Quick Reply)
 * Máximo 3 botones, cada título máx 20 caracteres
 */
export function buildWhatsAppButtonPayload(to: string, bodyText: string, buttons: MessageButton[]) {
  const validButtons = buttons.slice(0, 3).map(btn => ({
    type: 'reply' as const,
    reply: {
      id: btn.id,
      title: btn.title.substring(0, 20)
    }
  }));

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: markdownToWhatsApp(bodyText)
      },
      action: {
        buttons: validButtons
      }
    }
  };
}

/**
 * Genera el payload para un mensaje interactivo tipo lista (menú desplegable)
 * Máximo 10 filas, cada título máx 24 caracteres
 */
export function buildWhatsAppListPayload(
  to: string, 
  bodyText: string, 
  buttonTitle: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: markdownToWhatsApp(bodyText)
      },
      action: {
        button: buttonTitle.substring(0, 20),
        sections: sections.map(section => ({
          title: section.title.substring(0, 24),
          rows: section.rows.slice(0, 10).map(row => ({
            id: row.id,
            title: row.title.substring(0, 24),
            description: row.description?.substring(0, 72)
          }))
        }))
      }
    }
  };
}

/**
 * Selecciona el payload óptimo según el FormattedMessage
 */
export function buildWhatsAppPayload(to: string, formatted: FormattedMessage) {
  if (formatted.buttons.length > 0) {
    return buildWhatsAppButtonPayload(to, formatted.text, formatted.buttons);
  }
  return buildWhatsAppTextPayload(to, formatted.text);
}
