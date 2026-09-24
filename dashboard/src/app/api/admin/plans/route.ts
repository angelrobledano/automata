import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      include: { features: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('Error fetching admin plans:', error);
    return NextResponse.json({ error: 'Error al obtener planes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const plan = await prisma.plan.create({
      data: {
        name: data.name,
        description: data.description || '',
        monthlyPrice: parseFloat(data.monthlyPrice) || 0,
        annualPrice: parseFloat(data.annualPrice) || (parseFloat(data.monthlyPrice) || 0) * 10,
        providerPriceId: data.providerPriceId || null,
        features: {
          create: (data.features || []).map((f: any) => ({
            featureKey: f.featureKey,
            value: f.value
          }))
        }
      },
      include: { features: true }
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error('Error creating plan:', error);
    return NextResponse.json({ error: 'Error al crear plan' }, { status: 500 });
  }
}
