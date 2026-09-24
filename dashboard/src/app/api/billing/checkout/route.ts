import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    let commerceId = 'commerce-seed-id';
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.commerceId) {
        commerceId = payload.commerceId as string;
      }
    }

    let planId = 'plan-pro';
    let interval = 'month';

    try {
      const body = await request.json();
      if (body.planId) planId = body.planId;
      if (body.interval) interval = body.interval;
    } catch {
      // Body vacío o no parseable, usar defaults
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (stripeKey && !stripeKey.includes('sk_test_placeholder')) {
      const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Plan Automata Pro',
                description: 'Asistente de Pedidos y Soporte 24/7'
              },
              unit_amount: interval === 'year' ? 79000 : 7900,
              recurring: { interval: interval === 'year' ? 'year' : 'month' }
            },
            quantity: 1
          }
        ],
        success_url: `${request.headers.get('origin') || 'http://localhost:3000'}/ajustes/billing?success=true`,
        cancel_url: `${request.headers.get('origin') || 'http://localhost:3000'}/ajustes/billing?canceled=true`,
        metadata: { commerceId, planId }
      });

      return NextResponse.json({ url: session.url });
    }

    // B-11: sin Stripe configurado NO se activa nada (antes otorgaba
    // isLifetimeFree=true: SaaS gratis ilimitado por un bug de configuración).
    // Fail-closed con mensaje accionable para el operador.
    console.error('[Billing] STRIPE_SECRET_KEY no configurada: no se puede iniciar el checkout.');
    return NextResponse.json(
      { error: 'El sistema de pagos no está disponible ahora mismo. Contacta con soporte.' },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Error al procesar checkout' }, { status: 500 });
  }
}
