import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../../lib/jwt';

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

    const commerce = await prisma.commerce.findUnique({ 
      where: { id: commerceId },
      include: { channelConnections: true }
    });
    if (!commerce) return NextResponse.json({ error: 'No commerce found' }, { status: 404 });

    const knowledgeCount = await prisma.knowledgeSource.count({
      where: { commerceId: commerce.id }
    });

    const steps = {
      knowledge: knowledgeCount > 0,
      ecommerce: false,
      whatsapp: commerce.channelConnections.some(c => c.provider === 'META' && c.status === 'CONNECTED')
    };

    let progress = 0;
    if (steps.whatsapp) progress += 33;
    if (steps.ecommerce) progress += 33;
    if (steps.knowledge) progress += 34;

    return NextResponse.json({
      progress,
      steps
    });
  } catch (error: any) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
