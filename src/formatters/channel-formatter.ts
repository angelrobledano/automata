/**
 * Channel Formatter — Interfaz central y router de formateo adaptativo
 * 
 * Transforma las respuestas de texto plano de la IA en objetos estructurados
 * según el canal de destino (WhatsApp, Instagram, Messenger, Web).
 */

export type ChannelType = 'WHATSAPP' | 'INSTAGRAM' | 'MESSENGER' | 'WEB';

export interface MessageButton {
  id: string;
  title: string;
}

export interface FormattedMessage {
  /** Canal de destino */
  channel: ChannelType;
  /** Texto principal (siempre presente, formateado para el canal) */
  text: string;
  /** Botones interactivos opcionales (máx 3 para WhatsApp) */
  buttons: MessageButton[];
  /** Metadatos para el panel web admin */
  meta: {
    /** Tipo de renderizado rico detectado */
    type: 'rich_card' | 'product_list' | 'plain';
    /** Datos estructurados detectados (precios, productos) */
    structuredData?: { label: string; value: string }[];
    /** Descripción de cómo se envió al canal */
    channelPreview: string;
  };
}

/**
 * Detecta patrones de botones/CTAs en el texto de la IA.
 * Busca líneas con el formato [Botón: Texto] o [Acción: Texto]
 */
export function extractButtons(text: string): { cleanText: string; buttons: MessageButton[] } {
  const buttons: MessageButton[] = [];
  const buttonRegex = /\[(Botón|Acción|Button|Action):\s*(.+?)\]/gi;
  let match;
  let index = 0;

  while ((match = buttonRegex.exec(text)) !== null) {
    if (buttons.length < 3 && match[2]) {
      buttons.push({
        id: `btn_${index++}`,
        title: match[2].trim().substring(0, 20) // WhatsApp limita a 20 chars
      });
    }
  }

  const cleanText = text.replace(buttonRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, buttons };
}

/**
 * Detecta datos estructurados (precios con €) en el texto
 */
export function detectStructuredData(text: string): { label: string; value: string }[] {
  const priceRegex = /([^.\n]*?)(\d+[.,]?\d*\s*€[^\n]*)/g;
  const items: { label: string; value: string }[] = [];
  let match;

  while ((match = priceRegex.exec(text)) !== null) {
    const rawLabel = match[1] ?? '';
    const rawValue = match[2] ?? '';
    const label = rawLabel.replace(/^[•\-\*]\s*/, '').trim() || 'Producto';
    const value = rawValue.trim();
    if (label && value) {
      items.push({ label, value });
    }
  }

  return items;
}

/**
 * Determina el tipo de contenido rico según los datos detectados
 */
export function detectContentType(text: string, structuredData: { label: string; value: string }[]): 'rich_card' | 'product_list' | 'plain' {
  if (structuredData.length >= 3) return 'product_list';
  if (structuredData.length >= 1) return 'rich_card';
  return 'plain';
}

/**
 * Router principal: formatea un mensaje según el canal de destino
 */
export function formatForChannel(rawResponse: string, channel: ChannelType): FormattedMessage {
  const { cleanText, buttons } = extractButtons(rawResponse);
  const structuredData = detectStructuredData(cleanText);
  const contentType = detectContentType(cleanText, structuredData);

  let formattedText = cleanText;
  let channelPreview = '';

  switch (channel) {
    case 'WHATSAPP':
      // WhatsApp ya usa *negrita* nativamente, no necesita conversión
      channelPreview = buttons.length > 0
        ? `📱 Enviado como Botones Interactivos · WhatsApp`
        : `📱 Enviado como Texto · WhatsApp`;
      break;

    case 'INSTAGRAM':
      // Instagram Direct no soporta botones interactivos
      channelPreview = `📸 Enviado como Texto · Instagram Direct`;
      break;

    case 'MESSENGER':
      channelPreview = buttons.length > 0
        ? `💬 Enviado como Quick Replies · Messenger`
        : `💬 Enviado como Texto · Messenger`;
      break;

    case 'WEB':
    default:
      channelPreview = contentType !== 'plain'
        ? `🖥️ Renderizado como Tarjeta Rica · Panel Web`
        : `🖥️ Renderizado como Texto · Panel Web`;
      break;
  }

  return {
    channel,
    text: formattedText,
    buttons,
    meta: {
      type: contentType,
      ...(structuredData.length > 0 ? { structuredData } : {}),
      channelPreview
    }
  };
}
