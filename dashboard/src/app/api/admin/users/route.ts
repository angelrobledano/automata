import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || (payload.role !== 'SUPERADMIN' && payload.role !== 'SUPPORT')) {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    if (payload.isImpersonating) {
      return NextResponse.json({ error: 'No permitido durante la impersonación' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const commerceId = searchParams.get('commerceId') || '';
    const role = searchParams.get('role') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { commerce: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    if (commerceId) {
      where.commerceId = commerceId;
    }

    if (role !== 'ALL') {
      where.role = role;
    }

    if (status !== 'ALL') {
      where.status = status;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          commerceId: true,
          commerce: {
            select: { name: true, status: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error admin users GET:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
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

    const { userId, status, role, newPassword } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId requerido' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { commerce: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, role: true, status: true, commerceId: true }
    });

    await prisma.auditLog.create({
      data: {
        commerceId: user.commerceId,
        userId: user.id,
        impersonatorId: payload.userId as string,
        action: 'UPDATE_USER_ADMIN',
        targetId: user.id,
        details: `El administrador ${payload.email} actualizó al usuario ${user.email}: ${JSON.stringify(updateData)}`,
        metadata: {
          adminEmail: String(payload.email || ''),
          targetEmail: String(user.email || ''),
          changes: Object.keys(updateData)
        } as any
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error admin users PATCH:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
