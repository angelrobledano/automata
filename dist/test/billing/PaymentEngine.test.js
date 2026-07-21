"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const PaymentEngine_1 = require("../../billing/core/PaymentEngine");
const StripeProvider_1 = require("../../billing/providers/StripeProvider");
// Mock Provider
vitest_1.vi.mock('../../billing/providers/StripeProvider', () => {
    return {
        StripeProvider: vitest_1.vi.fn().mockImplementation(() => ({
            createCustomer: vitest_1.vi.fn().mockResolvedValue({ id: 'cus_test' }),
            createCheckoutSession: vitest_1.vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
            handleWebhook: vitest_1.vi.fn().mockResolvedValue({
                eventId: 'evt_test',
                eventType: 'SUBSCRIPTION_CREATED'
            })
        }))
    };
});
(0, vitest_1.describe)('PaymentEngine Strategy Pattern', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should instantiate StripeProvider by default', () => {
        const engine = new PaymentEngine_1.PaymentEngine('STRIPE');
        (0, vitest_1.expect)(StripeProvider_1.StripeProvider).toHaveBeenCalled();
    });
    (0, vitest_1.it)('should throw error for unsupported providers (e.g. REDSYS yet to be implemented)', () => {
        (0, vitest_1.expect)(() => new PaymentEngine_1.PaymentEngine('REDSYS')).toThrow('Payment provider REDSYS is not supported yet');
    });
    (0, vitest_1.it)('should delegate createCustomer to the active provider', async () => {
        const engine = new PaymentEngine_1.PaymentEngine('STRIPE');
        const res = await engine.provisionCustomer('com_123', 'test@test.com', 'Test Commerce');
        (0, vitest_1.expect)(res.id).toBe('cus_test');
    });
});
//# sourceMappingURL=PaymentEngine.test.js.map