import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { readCookieValue } from '../../../../../../src/utils/jwt';

/**
 * B-07: el CRUD de planes es God-Mode de plataforma — solo SUPERADMIN/SUPPORT.
 * 401 sin token válido; 403 autenticado sin rol de staff.
 */
async function requirePlatformStaff(request: Request): Promise<{ ok: true; payload: any } | { ok: false; status: 401 | 403 }> {
  const token = readCookieValue(request.headers.get('cookie'), 'token');
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return { ok: false, status: 401 };
  if (!['SUPERADMIN', 'SUPPORT'].includes(String(payload.role))) return { ok: false, status: 403 };
  return { ok: true, payload };
}

export async function GET(request: Request) {
  try {
    const auth = await requirePlatformStaff(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
    }
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
    const auth = await requirePlatformStaff(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
    }
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
