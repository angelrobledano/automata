import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../src/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    let commerceId = 'commerce-seed-id';
    if (token) {
      const payload = await verifyToken(token);
      if (payload && payload.commerceId) {
        commerceId = payload.commerceId as string;
      }
    }

    const sessions = await prisma.session.findMany({
      where: { commerceId, isTest: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error('Error fetching sessions API:', error);
    return NextResponse.json({ error: 'Error interno al cargar sesiones' }, { status: 500 });
  }
}
