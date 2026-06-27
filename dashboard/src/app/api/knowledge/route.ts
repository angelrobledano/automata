import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/db/prisma';

import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const commerceId = payload.commerceId;

    const sources = await prisma.knowledgeSource.findMany({
      where: { commerceId },
      include: {
        _count: { select: { chunks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    console.error('Error fetching knowledge sources:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
