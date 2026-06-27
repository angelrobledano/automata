import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../src/db/prisma';

export async function GET(req: Request) {
  try {
    const token = req.headers.get('cookie')?.split('token=')[1]?.split(';')[0];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const commerceId = payload.commerceId as string;

    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId },
      select: {
        isLifetimeFree: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
      }
    });

    if (!commerce) {
      return NextResponse.json({ error: 'Commerce not found' }, { status: 404 });
    }

    return NextResponse.json(commerce, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching billing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
