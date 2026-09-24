import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    let commerceId: string | null = null;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.commerceId) {
        commerceId = payload.commerceId as string;
      }
    }

    // Si no hay token o commerceId válido, fallback a seed/demo para visualización
    if (!commerceId) {
      commerceId = 'commerce-seed-id';
    }

    let plans = await prisma.plan.findMany({
      where: { status: 'ACTIVE' },
      include: { features: true },
      orderBy: { monthlyPrice: 'asc' }
    });

    // Si no hay planes aún en la BD, creamos o devolvemos los planes estándar de Automata
    if (plans.length === 0) {
      plans = [
        {
          id: 'plan-starter',
          name: 'Starter',
          description: 'Ideal para pequeños negocios y comercios locales.',
          status: 'ACTIVE',
          monthlyPrice: 29,
          annualPrice: 290,
          currency: 'EUR',
          providerPriceId: 'price_starter',
          providerAnnualPriceId: 'price_starter_year',
          createdAt: new Date(),
          updatedAt: new Date(),
          features: [
            { id: 'f1', planId: 'plan-starter', featureKey: 'max_conversations', value: '500' },
            { id: 'f2', planId: 'plan-starter', featureKey: 'whatsapp_enabled', value: 'true' },
            { id: 'f3', planId: 'plan-starter', featureKey: 'orders_enabled', value: 'true' }
          ]
        },
        {
          id: 'plan-pro',
          name: 'Pro',
          description: 'Para tiendas con alto volumen de pedidos y catálogos grandes.',
          status: 'ACTIVE',
          monthlyPrice: 79,
          annualPrice: 790,
          currency: 'EUR',
          providerPriceId: 'price_pro',
          providerAnnualPriceId: 'price_pro_year',
          createdAt: new Date(),
          updatedAt: new Date(),
          features: [
            { id: 'f4', planId: 'plan-pro', featureKey: 'max_conversations', value: 'UNLIMITED' },
            { id: 'f5', planId: 'plan-pro', featureKey: 'whatsapp_enabled', value: 'true' },
            { id: 'f6', planId: 'plan-pro', featureKey: 'orders_enabled', value: 'true' },
            { id: 'f7', planId: 'plan-pro', featureKey: 'multi_agent', value: 'true' }
          ]
        }
      ] as any;
    }

    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId },
      include: { 
        subscriptions: {
          include: { plan: true }
        } 
      }
    });

    return NextResponse.json({ plans, commerce });
  } catch (error: any) {
    console.error('Error fetching billing portal data:', error);
    return NextResponse.json({ error: 'Error al obtener datos de facturación' }, { status: 500 });
  }
}
