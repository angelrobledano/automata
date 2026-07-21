import { IPaymentProvider, BillingCustomer, CheckoutSessionResult, PaymentEvent } from '../interfaces/IPaymentProvider';
export declare class StripeProvider implements IPaymentProvider {
    private stripe;
    private webhookSecret;
    constructor();
    createCustomer(commerceId: string, email: string, name: string): Promise<BillingCustomer>;
    createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string, metadata?: Record<string, string>): Promise<CheckoutSessionResult>;
    createCustomerPortal(customerId: string, returnUrl: string): Promise<string>;
    cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>;
    handleWebhook(rawBody: string | Buffer, signature: string): Promise<PaymentEvent>;
}
//# sourceMappingURL=StripeProvider.d.ts.map