import { PaymentEvent } from '../interfaces/IPaymentProvider';
export declare class PaymentEngine {
    private provider;
    constructor(providerStr?: string);
    provisionCustomer(commerceId: string, email: string, name: string): Promise<import("../interfaces/IPaymentProvider").BillingCustomer>;
    createSubscriptionCheckout(customerId: string, priceId: string, successUrl: string, cancelUrl: string): Promise<import("../interfaces/IPaymentProvider").CheckoutSessionResult>;
    getCustomerPortal(customerId: string, returnUrl: string): Promise<string>;
    cancelSubscription(subscriptionId: string): Promise<void>;
    /**
     * Processes an incoming webhook from the active provider.
     * Ensures idempotency and translates to internal domain events.
     */
    processWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>;
}
//# sourceMappingURL=PaymentEngine.d.ts.map