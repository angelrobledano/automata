import Stripe from 'stripe';
import { IPaymentProvider, BillingCustomer, CheckoutSessionResult, PaymentEvent } from '../interfaces/IPaymentProvider';

export class StripeProvider implements IPaymentProvider {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    
    this.stripe = new Stripe(secretKey, {
      // @ts-ignore
      apiVersion: '2024-06-20',
    });
  }

  async createCustomer(commerceId: string, email: string, name: string): Promise<BillingCustomer> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        commerceId,
      },
    });

    return { id: customer.id };
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>
  ): Promise<CheckoutSessionResult> {
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata || {},
    });

    if (!session.url) {
      throw new Error('Failed to create Stripe Checkout Session');
    }

    return { url: session.url };
  }

  async createCustomerPortal(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = false): Promise<void> {
    if (atPeriodEnd) {
      await this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    } else {
      await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async handleWebhook(rawBody: string | Buffer, signature: string): Promise<PaymentEvent> {
    let event: Stripe.Event;
    
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    let eventType: PaymentEvent['eventType'] | null = null;
    let commerceId: string | undefined;
    let subscriptionId: string | undefined;
    let planId: string | undefined;

    switch (event.type) {
      case 'customer.subscription.created':
        eventType = 'SUBSCRIPTION_CREATED';
        break;
      case 'customer.subscription.updated':
        eventType = 'SUBSCRIPTION_UPDATED';
        break;
      case 'customer.subscription.deleted':
        eventType = 'SUBSCRIPTION_CANCELLED';
        break;
      case 'invoice.payment_succeeded':
        eventType = 'PAYMENT_SUCCEEDED';
        break;
      case 'invoice.payment_failed':
        eventType = 'PAYMENT_FAILED';
        break;
      default:
        // Unhandled event
        throw new Error(`Unhandled Stripe event type: ${event.type}`);
    }

    // Extract common data
    const dataObject = event.data.object as any;
    
    if (dataObject.metadata?.commerceId) {
      commerceId = dataObject.metadata.commerceId;
    }
    
    if (dataObject.id && dataObject.object === 'subscription') {
      subscriptionId = dataObject.id;
      // In a real app we'd map stripe price IDs back to our DB plan IDs, or pass them through metadata
    } else if (dataObject.subscription) {
      subscriptionId = dataObject.subscription;
    }

    return {
      eventId: event.id,
      eventType,
      rawPayload: event,
      commerceId: dataObject.metadata?.commerceId || undefined,
      subscriptionId: dataObject.subscription?.id || undefined,
      planId: planId || undefined
    };
  }
}
