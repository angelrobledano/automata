import { describe, it, expect } from 'vitest';
import { resolveTargetRoom } from '../utils/socket';

/**
 * B-05: los eventos en tiempo real solo pueden llegar a la sala del comercio
 * propietario. Nunca un broadcast global.
 */

describe('resolveTargetRoom', () => {
  it('resuelve la sala commerce:<id> para chat_updates con commerceId', () => {
    expect(resolveTargetRoom('chat_updates', { commerceId: 'commerce-1', sessionId: 's1' })).toBe('commerce:commerce-1');
  });

  it('resuelve la sala commerce:<id> para order_events con commerceId', () => {
    expect(resolveTargetRoom('order_events', { commerceId: 'commerce-2', type: 'NEW_ORDER' })).toBe('commerce:commerce-2');
  });

  it('devuelve null si el evento no lleva commerceId (no se retransmite a nadie)', () => {
    expect(resolveTargetRoom('chat_updates', { sessionId: 's1' })).toBeNull();
    expect(resolveTargetRoom('order_events', { type: 'NEW_ORDER' })).toBeNull();
    expect(resolveTargetRoom('chat_updates', null)).toBeNull();
    expect(resolveTargetRoom('chat_updates', 'no-es-objeto')).toBeNull();
  });

  it('devuelve null para canales desconocidos', () => {
    expect(resolveTargetRoom('canal_desconocido', { commerceId: 'c1' })).toBeNull();
  });
});
