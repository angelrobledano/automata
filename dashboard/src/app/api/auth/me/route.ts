import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../src/db/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Fetch fresh commerce and user status
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      include: {
        commerce: {
          select: {
            name: true,
            status: true,
            isLifetimeFree: true,
            subscriptionStatus: true,
            onboardingCompleted: true
          }
        }
      }
    });

    if (!user || user.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Cuenta suspendida o no encontrada' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        commerceId: user.commerceId,
        commerceName: user.commerce.name,
        commerceStatus: user.commerce.status,
        isLifetimeFree: user.commerce.isLifetimeFree,
        subscriptionStatus: user.commerce.subscriptionStatus,
        onboardingCompleted: user.commerce.onboardingCompleted
      },
      isImpersonating: !!payload.isImpersonating,
      impersonator: payload.impersonator || null
    });
  } catch (error: any) {
    console.error('Error fetching me:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
