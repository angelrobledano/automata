import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { verifyToken } from '../../../../../lib/jwt';
import { readCookieValue } from '../../../../../../../src/utils/jwt';

async function requirePlatformStaff(request: Request): Promise<{ ok: true; payload: any } | { ok: false; status: 401 | 403 }> {
  const token = readCookieValue(request.headers.get('cookie'), 'token');
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return { ok: false, status: 401 };
  if (!['SUPERADMIN', 'SUPPORT'].includes(String(payload.role))) return { ok: false, status: 403 };
  return { ok: true, payload };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePlatformStaff(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
    }
    const { id } = await params;
    const data = await request.json();

    if (id === 'new') {
      const newPlan = await prisma.plan.create({
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
        }
      });
      return NextResponse.json(newPlan, { status: 201 });
    }

    await prisma.plan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        monthlyPrice: parseFloat(data.monthlyPrice) || 0,
        annualPrice: parseFloat(data.annualPrice) || (parseFloat(data.monthlyPrice) || 0) * 10,
        providerPriceId: data.providerPriceId
      }
    });

    // Reemplazar características
    if (data.features) {
      await prisma.planFeature.deleteMany({ where: { planId: id } });
      if (data.features.length > 0) {
        await prisma.planFeature.createMany({
          data: data.features.map((f: any) => ({
            planId: id,
            featureKey: f.featureKey,
            value: f.value
          }))
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Error al actualizar plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requirePlatformStaff(request);
    if (!auth.ok) {
      return NextResponse.json({ error: 'No autorizado' }, { status: auth.status });
    }
    const { id } = await params;
    await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ error: 'Error al eliminar plan' }, { status: 500 });
  }
}
