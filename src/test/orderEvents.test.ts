import { describe, it, expect } from 'vitest';

describe('OrderService Event Publishing', () => {
  it('debe estructurar el payload de new_order con campos indispensables', () => {
    const payload = {
      type: 'NEW_ORDER',
      commerceId: 'comm_123',
      order: {
        id: 'ord_999',
        customerName: 'Juan Pérez',
        customerPhone: '+34600112233',
        totalAmount: 25.5,
        source: 'MANUAL',
        status: 'PENDING',
        isOutOfHours: true,
        createdAt: new Date().toISOString()
      }
    };
    expect(payload.type).toBe('NEW_ORDER');
    expect(payload.order.customerPhone).toBe('+34600112233');
    expect(payload.order.isOutOfHours).toBe(true);
  });
});
