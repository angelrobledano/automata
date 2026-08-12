/**
 * Web Formatter — Formatea mensajes para la interfaz web del panel admin
 * 
 * Detecta datos estructurados y genera metadata para renderizado rico
 * en el dashboard (cards de productos, badges de precio, etc.)
 */

import { FormattedMessage } from './channel-formatter';

/**
 * Convierte formato WhatsApp nativo a HTML para el panel web
 * *bold* → <strong>, _italic_ → <em>, ~strike~ → <del>
 */
export function whatsappToHtml(text: string): string {
  let result = text;
  // *bold* → <strong> (cuidado de no romper listas con *)
  result = result.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<strong>$1</strong>');
  // _italic_ → <em>
  result = result.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<em>$1</em>');
  // ~strikethrough~ → <del>
  result = result.replace(/(?<!\w)~([^~\n]+)~(?!\w)/g, '<del>$1</del>');
  // Viñetas • al inicio de línea
  result = result.replace(/^• /gm, '• ');
  return result;
}

/**
 * Enriquece un FormattedMessage con datos específicos para la web
 */
export function enrichForWeb(formatted: FormattedMessage): FormattedMessage {
  return {
    ...formatted,
    text: whatsappToHtml(formatted.text),
    meta: {
      ...formatted.meta,
      channelPreview: formatted.meta.channelPreview || '🖥️ Panel Web'
    }
  };
}
