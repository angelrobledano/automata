import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: sourceId } = await params;

    // Verify ownership
    const source = await prisma.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        commerceId: payload.commerceId
      }
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Fetch chunks (excluding embeddings for size reasons)
    const chunks = await prisma.documentChunk.findMany({
      where: {
        knowledgeSourceId: sourceId
      },
      select: {
        id: true,
        content: true,
      }
    });

    return NextResponse.json({ success: true, chunks });
  } catch (error) {
    console.error('Error fetching chunks:', error);
    return NextResponse.json({ error: 'Failed to fetch chunks' }, { status: 500 });
  }
}
