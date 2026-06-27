import Stripe from 'stripe';

export const createCheckoutSession = async (commerceId: string): Promise<string> => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe secret key not configured');
  }

  const stripe = new Stripe(secretKey, { apiVersion: '2025-02-24' as any });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Plan Pro (Mensual)',
          },
          unit_amount: 4900, // 49€
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/ajustes`,
    metadata: {
      commerceId,
    },
  });

  if (!session.url) throw new Error('Stripe failed to return URL');

  return session.url;
};

export const mapStripeStatusToPlan = (status: string): string => {
  switch (status) {
    case 'active':
      return 'PRO';
    case 'past_due':
      return 'FROZEN';
    case 'canceled':
      return 'FREE';
    default:
      return 'FREE';
  }
};
