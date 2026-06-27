import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { verifyToken } from '../../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    const { commerceId, isFree } = await request.json();

    await prisma.commerce.update({
      where: { id: commerceId },
      data: { isLifetimeFree: isFree }
    });

    // Auditoría
    await prisma.auditLog.create({
      data: {
        commerceId: commerceId,
        userId: payload.userId as string,
        action: isFree ? 'GRANT_LIFETIME_FREE' : 'REVOKE_LIFETIME_FREE',
        targetId: commerceId,
        details: 'Admin override for lifetime free'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error toggling free tier:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
