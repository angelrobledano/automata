import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../src/db/prisma';
import { verifyToken } from '../../../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'SUPERADMIN' && payload.role !== 'SUPPORT')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    if (payload.isImpersonating) {
      return NextResponse.json({ error: 'No permitido en modo impersonación' }, { status: 403 });
    }

    const { status, isLifetimeFree } = await request.json();

    const commerce = await prisma.commerce.findUnique({ where: { id } });
    if (!commerce) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (isLifetimeFree !== undefined) {
      updateData.isLifetimeFree = isLifetimeFree;
      if (isLifetimeFree) updateData.subscriptionStatus = 'ACTIVE';
    }

    const updatedCommerce = await prisma.commerce.update({
      where: { id },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        commerceId: id,
        userId: payload.userId as string,
        action: 'UPDATE_COMMERCE_STATUS',
        targetId: id,
        details: `Admin ${payload.email} actualizó estado de ${commerce.name}: status=${status || commerce.status}, VIP=${isLifetimeFree ?? commerce.isLifetimeFree}`,
        metadata: {
          adminEmail: String(payload.email || ''),
          previousStatus: String(commerce.status || ''),
          newStatus: String(status || commerce.status || ''),
          isLifetimeFree: Boolean(isLifetimeFree ?? commerce.isLifetimeFree)
        } as any
      }
    });

    return NextResponse.json({ success: true, commerce: updatedCommerce });
  } catch (error: any) {
    console.error('Error updating commerce status:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
