import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { purgeSemanticCache } from '../../../../../../src/rag/index';

import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id: sourceId } = await params;

    if (!sourceId) {
      return NextResponse.json({ error: 'Falta el ID de la fuente.' }, { status: 400 });
    }

    // Verify ownership before deleting
    const source = await prisma.knowledgeSource.findFirst({
      where: {
        id: sourceId,
        commerceId: payload.commerceId
      }
    });

    if (!source) {
      return NextResponse.json({ error: 'No autorizado o fuente no encontrada.' }, { status: 403 });
    }

    // First delete all chunks associated with this source
    await prisma.documentChunk.deleteMany({
      where: { knowledgeSourceId: sourceId }
    });

    // Then delete the source itself
    await prisma.knowledgeSource.delete({
      where: { id: sourceId }
    });

    // Purgar la caché semántica del comercio
    await purgeSemanticCache(payload.commerceId as string);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting knowledge source:', error);
    return NextResponse.json({ error: 'No hemos podido eliminar este conocimiento. Inténtalo de nuevo.' }, { status: 500 });
  }
}
