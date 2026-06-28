import { IPaymentProvider, PaymentEvent } from '../interfaces/IPaymentProvider';
import { StripeProvider } from '../providers/StripeProvider';

// En un entorno de Inversión de Dependencias (DI) real como NestJS o Inversify, 
// inyectaríamos la dependencia. Aquí usaremos un Factory o inyección simple en el constructor.

export class PaymentEngine {
  private provider: IPaymentProvider;

  constructor(providerStr?: string) {
    const selectedProvider = providerStr || process.env.PAYMENT_PROVIDER || 'STRIPE';
    
    if (selectedProvider === 'STRIPE') {
      this.provider = new StripeProvider();
    } else {
      throw new Error(`Payment provider ${selectedProvider} is not supported yet.`);
    }
  }

  // Exposed Business Methods

  async provisionCustomer(commerceId: string, email: string, name: string) {
    return this.provider.createCustomer(commerceId, email, name);
  }

  async createSubscriptionCheckout(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    return this.provider.createCheckoutSession(customerId, priceId, successUrl, cancelUrl);
  }

  async getCustomerPortal(customerId: string, returnUrl: string) {
    return this.provider.createCustomerPortal(customerId, returnUrl);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.provider.cancelSubscription(subscriptionId, true); // default to end of period
  }

  /**
   * Processes an incoming webhook from the active provider.
   * Ensures idempotency and translates to internal domain events.
   */
  async processWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent> {
    return this.provider.handleWebhook(rawBody, signature);
  }
}
