import { NextResponse } from 'next/server';
import { verifyToken, signToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../src/db/prisma';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get('token')?.value;

    if (!currentToken) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
    }

    const payload = await verifyToken(currentToken);
    if (!payload || !payload.isImpersonating || !payload.impersonator) {
      return NextResponse.json({ error: 'No estás en modo impersonación' }, { status: 400 });
    }

    const { userId: adminId, email: adminEmail, role: adminRole } = payload.impersonator as any;

    // Buscar al superadmin original
    const adminUser = await prisma.user.findUnique({
      where: { id: adminId },
      include: { commerce: true }
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'Usuario administrador no encontrado' }, { status: 404 });
    }

    // Calcular duración de la impersonación
    let durationSeconds = 0;
    if (payload.impersonatedAt) {
      const startTime = new Date(payload.impersonatedAt as string).getTime();
      durationSeconds = Math.round((Date.now() - startTime) / 1000);
    }

    // Registrar fin de impersonación en auditoría
    await prisma.auditLog.create({
      data: {
        commerceId: payload.commerceId as string,
        userId: payload.userId as string,
        impersonatorId: adminId,
        action: 'IMPERSONATION_END',
        targetId: payload.commerceId as string,
        details: `El administrador ${adminEmail} finalizó la impersonación tras ${durationSeconds} segundos.`,
        metadata: {
          durationSeconds: Number(durationSeconds || 0),
          adminEmail: String(adminEmail || ''),
          targetCommerceId: String(payload.commerceId || '')
        } as any
      }
    });

    // Restaurar Token de Administrador limpio
    const adminToken = await signToken({
      userId: adminUser.id,
      commerceId: adminUser.commerceId,
      email: adminUser.email,
      role: adminUser.role,
      isLifetimeFree: adminUser.commerce.isLifetimeFree,
      subscriptionStatus: adminUser.commerce.subscriptionStatus
    }, '24h');

    cookieStore.set('token', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({
      success: true,
      redirect: '/backoffice'
    });
  } catch (error: any) {
    console.error('Error en unimpersonate:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
