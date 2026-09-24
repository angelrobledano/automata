import { describe, it, expect } from 'vitest';
import { validateTakeOrderArgs, validateResponseQuality } from '../rag/quality-layer';

/**
 * B-16: el output del LLM no es confiable — los argumentos de take_order se
 * validan antes de crear un pedido.
 * B-23: la validación de horarios es genérica (sin literales de una demo).
 */

describe('validateTakeOrderArgs (B-16)', () => {
  const valid = {
    deliveryType: 'PICKUP',
    items: [{ name: 'Tarta de queso', quantity: 2 }],
  };

  it('acepta argumentos válidos y normaliza tipos', () => {
    const result = validateTakeOrderArgs({
      ...valid,
      customerName: '  Ángel  ',
      deliveryType: 'DELIVERY',
      deliveryAddress: 'C/ Falsa 123',
      items: [{ name: 'Pan', quantity: 3, price: '1.5', notes: 'poco cocido' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.customerName).toBe('Ángel');
      expect(result.value.deliveryType).toBe('DELIVERY');
      expect(result.value.items[0]!.quantity).toBe(3);
      expect(result.value.items[0]!.price).toBe(1.5);
    }
  });

  it('rechaza items vacíos o no array', () => {
    expect(validateTakeOrderArgs({ ...valid, items: [] }).ok).toBe(false);
    expect(validateTakeOrderArgs({ ...valid, items: 'dos panes' }).ok).toBe(false);
    expect(validateTakeOrderArgs(null).ok).toBe(false);
  });

  it('rechaza cantidades inválidas (0, negativas, no enteras, absurdas)', () => {
    for (const q of [0, -2, 1.5, 1000]) {
      expect(validateTakeOrderArgs({ ...valid, items: [{ name: 'X', quantity: q }] }).ok).toBe(false);
    }
  });

  it('rechaza artículos sin nombre', () => {
    expect(validateTakeOrderArgs({ ...valid, items: [{ quantity: 1 }] }).ok).toBe(false);
  });

  it('rechaza pedidos a domicilio sin dirección', () => {
    expect(validateTakeOrderArgs({ ...valid, deliveryType: 'DELIVERY' }).ok).toBe(false);
  });

  it('rechaza precios absurdos', () => {
    expect(validateTakeOrderArgs({ ...valid, items: [{ name: 'X', quantity: 1, price: -5 }] }).ok).toBe(false);
  });

  it('recorta strings gigantes (límite de longitud)', () => {
    const result = validateTakeOrderArgs({ ...valid, customerName: 'A'.repeat(500) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.customerName!.length).toBeLessThanOrEqual(120);
  });
});

describe('validateResponseQuality — detección genérica de horarios (B-23)', () => {
  const facts: any = {
    intent: 'BUSINESS_HOURS',
    activeRules: [{ name: 'Horario de verano' }],
    overriddenRuleNames: ['Horario habitual'],
    resolvedFactsText:
      'REGLA RESUELTA VIGENTE: Horario de verano. Horario aplicable: 09:00 a 14:00 y de 19:30 a 21:30. (REGLAS ANULADAS: Horario habitual)',
  };

  it('detecta un horario no vigente mezclado en la respuesta (20:00 no está en los hechos)', () => {
    const bad = 'Abrimos de 9:00 a 20:00 y por las tardes de 19:30 a 21:30.';
    const result = validateResponseQuality(bad, facts);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain('CONTRADICTION_DETECTED');
  });

  it('acepta una respuesta que solo cita horarios vigentes (normalizando 9:00 -> 09:00)', () => {
    const good = 'Abrimos de 9:00 a 14:00 y por las tardes de 19:30 a 21:30.';
    expect(validateResponseQuality(good, facts).passed).toBe(true);
  });

  it('acepta horarios presentes en el contexto RAG permitido aunque no en los hechos', () => {
    const saturday = 'Los sábados abrimos de 10:00 a 13:30.';
    expect(validateResponseQuality(saturday, facts, '[Fuente: horarios.md] Sábados: 10:00 a 13:30.').passed).toBe(true);
  });

  it('con horarios hardcodeados de una tienda demo en los hechos, otra tienda pasa si coincide', () => {
    const otherShop: any = {
      intent: 'BUSINESS_HOURS',
      activeRules: [{ name: 'Horario especial' }],
      overriddenRuleNames: [],
      resolvedFactsText: 'Horario aplicable: 11:00 a 23:00.',
    };
    expect(validateResponseQuality('Abrimos de 11:00 a 23:00.', otherShop).passed).toBe(true);
    expect(validateResponseQuality('Abrimos de 11:00 a 23:00 y de 19:30 a 21:30.', otherShop).passed).toBe(false);
  });
});
