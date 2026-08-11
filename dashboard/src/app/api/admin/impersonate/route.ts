import { NextResponse } from 'next/server';
import { verifyToken, signToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../src/db/prisma';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get('token')?.value;

    if (!currentToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(currentToken);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Bloquear si ya está en modo impersonación (prevenir anidamiento)
    if (payload.isImpersonating) {
      return NextResponse.json({ error: 'No se permite anidar impersonaciones' }, { status: 400 });
    }

    const adminRole = payload.role as string;
    if (adminRole !== 'SUPERADMIN' && adminRole !== 'SUPPORT') {
      return NextResponse.json({ error: 'Acceso denegado: Requiere rol SUPERADMIN o SUPPORT' }, { status: 403 });
    }

    const body = await request.json();
    const { commerceId, userId } = body;

    if (!commerceId) {
      return NextResponse.json({ error: 'ID de empresa requerido' }, { status: 400 });
    }

    const targetCommerce = await prisma.commerce.findUnique({
      where: { id: commerceId }
    });

    if (!targetCommerce) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    // Buscar usuario objetivo: específico o el primer OWNER
    let targetUser = null;
    if (userId) {
      targetUser = await prisma.user.findFirst({
        where: { id: userId, commerceId }
      });
    }

    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { commerceId, role: 'OWNER' }
      }) || await prisma.user.findFirst({
        where: { commerceId }
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'No hay usuarios asociados a esta empresa' }, { status: 404 });
    }

    // Crear token de Impersonación
    const impersonationPayload = {
      userId: targetUser.id,
      commerceId: targetCommerce.id,
      email: targetUser.email,
      role: targetUser.role,
      isLifetimeFree: targetCommerce.isLifetimeFree,
      subscriptionStatus: targetCommerce.subscriptionStatus,
      isImpersonating: true,
      impersonatedAt: new Date().toISOString(),
      impersonator: {
        userId: payload.userId,
        email: payload.email,
        role: payload.role
      }
    };

    const impersonationToken = await signToken(impersonationPayload, '2h');

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        commerceId: targetCommerce.id,
        userId: targetUser.id,
        impersonatorId: payload.userId as string,
        action: 'IMPERSONATION_START',
        targetId: targetCommerce.id,
        details: `El administrador ${payload.email} (${payload.role}) inició impersonación en ${targetCommerce.name} (${targetUser.email})`,
        metadata: {
          impersonatorEmail: String(payload.email || ''),
          impersonatorRole: String(payload.role || ''),
          targetUserEmail: String(targetUser.email || '')
        } as any
      }
    });

    cookieStore.set('token', impersonationToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({
      success: true,
      redirect: '/dashboard',
      targetCommerce: targetCommerce.name
    });
  } catch (error: any) {
    console.error('Error en impersonate:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
