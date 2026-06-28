export interface BillingCustomer {
  id: string; // The provider's ID (e.g. cus_123)
}

export interface CheckoutSessionResult {
  url: string;
}

export interface PaymentEvent {
  eventId: string; // Used for idempotency
  eventType: 'SUBSCRIPTION_CREATED' | 'SUBSCRIPTION_UPDATED' | 'SUBSCRIPTION_CANCELLED' | 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED';
  rawPayload: any;
  commerceId?: string;
  subscriptionId?: string;
  planId?: string;
}

export interface IPaymentProvider {
  /**
   * Initializes a customer in the payment provider
   */
  createCustomer(commerceId: string, email: string, name: string): Promise<BillingCustomer>;
  
  /**
   * Generates a checkout URL for a specific plan
   */
  createCheckoutSession(
    customerId: string, 
    priceId: string, 
    successUrl: string, 
    cancelUrl: string,
    metadata?: Record<string, string>
  ): Promise<CheckoutSessionResult>;
  
  /**
   * Generates a billing portal URL for the customer to manage their subscription
   */
  createCustomerPortal(customerId: string, returnUrl: string): Promise<string>;
  
  /**
   * Cancels an active subscription immediately or at period end
   */
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>;
  
  /**
   * Parses and validates a webhook payload from the provider
   */
  handleWebhook(rawBody: string | Buffer, signature: string): Promise<PaymentEvent>;
}
