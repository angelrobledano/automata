import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { readCookieValue } from '../../../../../../src/utils/jwt';
import { addTextThread } from '../../../../../../src/rag/index';

/**
 * B-06: requiere sesión y solo permite resolver insights del propio comercio.
 * El conocimiento se crea directamente (sin fetch interno), siempre en el
 * comercio del insight (que ya verificamos que pertenece al llamante).
 */
export async function POST(request: Request) {
  try {
    const token = readCookieValue(request.headers.get('cookie'), 'token');
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const commerceId = payload.commerceId as string;

    const { insightId, action } = await request.json();

    if (!insightId) {
      return NextResponse.json({ error: 'Insight ID is required' }, { status: 400 });
    }

    const insight = await prisma.insight.findFirst({ where: { id: insightId, commerceId } });
    if (!insight) return NextResponse.json({ error: 'Insight not found' }, { status: 404 });

    // Si la acción es CREATE_KNOWLEDGE
    if (action === 'CREATE_KNOWLEDGE' && insight.actionData) {
      const data = typeof insight.actionData === 'string' ? JSON.parse(insight.actionData) : insight.actionData as any;

      await addTextThread(
        commerceId,
        data.title || insight.title,
        data.content,
        data.category || 'GENERAL'
      );
    }

    // Marcar como resuelto
    await prisma.insight.update({
      where: { id: insightId },
      data: { isResolved: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error resolving insight:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
