import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '../../../../../../src/db/prisma';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'fake_key', { apiVersion: '2025-02-24' as any });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'fake_secret';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const commerceId = session.metadata?.commerceId;
        
        if (commerceId && session.customer) {
          await prisma.commerce.update({
            where: { id: commerceId },
            data: { 
              subscriptionStatus: 'ACTIVE',
              stripeCustomerId: session.customer as string
            }
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.customer) {
          await prisma.commerce.updateMany({
            where: { stripeCustomerId: subscription.customer as string },
            data: { subscriptionStatus: 'CANCELED' }
          });
        }
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error handling webhook event', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
