/**
 * B-05: los eventos en tiempo real solo se retransmiten a la sala del comercio
 * propietario. Nunca broadcast global.
 */

export function roomForCommerce(commerceId: string): string {
  return `commerce:${commerceId}`;
}

/**
 * Determina la sala destino de un evento publicado en Redis.
 * Devuelve null si el evento no lleva commerceId (no se retransmite a nadie)
 * o si el canal es desconocido.
 */
export function resolveTargetRoom(channel: string, data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const commerceId = (data as { commerceId?: unknown }).commerceId;
  if (typeof commerceId !== 'string' || !commerceId) return null;

  switch (channel) {
    case 'chat_updates':
    case 'order_events':
      return roomForCommerce(commerceId);
    default:
      return null;
  }
}
