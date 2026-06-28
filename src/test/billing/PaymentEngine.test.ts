import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentEngine } from '../../billing/core/PaymentEngine';
import { StripeProvider } from '../../billing/providers/StripeProvider';

// Mock Provider
vi.mock('../../billing/providers/StripeProvider', () => {
  return {
    StripeProvider: vi.fn().mockImplementation(() => ({
      createCustomer: vi.fn().mockResolvedValue({ id: 'cus_test' }),
      createCheckoutSession: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
      handleWebhook: vi.fn().mockResolvedValue({
        eventId: 'evt_test',
        eventType: 'SUBSCRIPTION_CREATED'
      })
    }))
  };
});

describe('PaymentEngine Strategy Pattern', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate StripeProvider by default', () => {
    const engine = new PaymentEngine('STRIPE');
    expect(StripeProvider).toHaveBeenCalled();
  });

  it('should throw error for unsupported providers (e.g. REDSYS yet to be implemented)', () => {
    expect(() => new PaymentEngine('REDSYS')).toThrow('Payment provider REDSYS is not supported yet');
  });

  it('should delegate createCustomer to the active provider', async () => {
    const engine = new PaymentEngine('STRIPE');
    const res = await engine.provisionCustomer('com_123', 'test@test.com', 'Test Commerce');
    expect(res.id).toBe('cus_test');
  });

});
