import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    let commerceId = 'commerce-seed-id';
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.commerceId) {
        commerceId = payload.commerceId as string;
      }
    }

    const { overageBehavior } = await request.json();

    await prisma.commerce.update({
      where: { id: commerceId },
      data: { overageBehavior: overageBehavior || 'HARD_LIMIT' }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating billing preferences:', error);
    return NextResponse.json({ error: 'Error al actualizar preferencias' }, { status: 500 });
  }
}
