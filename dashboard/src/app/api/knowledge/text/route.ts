import { NextResponse } from 'next/server';
import { addTextThread, updateTextThread } from '../../../../../../src/rag/index';
import { verifyToken } from '../../../../lib/jwt';
import { readCookieValue } from '../../../../../../src/utils/jwt';
import { prisma } from '../../../../../../src/db/prisma';

/**
 * B-06: el commerceId SIEMPRE viene del JWT (nunca del body) y el PUT verifica
 * que el sourceId pertenece al comercio del llamante antes de actualizar.
 */
async function requireCommerceId(request: Request): Promise<string | null> {
  const token = readCookieValue(request.headers.get('cookie'), 'token');
  if (!token) return null;
  const payload = await verifyToken(token);
  return (payload?.commerceId as string) || null;
}

export async function POST(request: Request) {
  try {
    const commerceId = await requireCommerceId(request);
    if (!commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, text, category } = body;

    if (!title || !text) {
      return NextResponse.json({ error: 'Añade un título y contenido para guardar el conocimiento.' }, { status: 400 });
    }

    const result = await addTextThread(commerceId, title, text, category || "GENERAL");
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error creating text thread:', error);
    let msg = error.message || 'Error al guardar el conocimiento';
    if (msg.includes('Incorrect API key')) msg = 'La clave de IA proporcionada no parece válida. Revísala en Ajustes para continuar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const commerceId = await requireCommerceId(request);
    if (!commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceId, title, text, category } = body;

    if (!sourceId || !title || !text) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para actualizar' }, { status: 400 });
    }

    // Verificar propiedad: el sourceId debe pertenecer al comercio del llamante
    const source = await prisma.knowledgeSource.findFirst({
      where: { id: sourceId, commerceId },
      select: { id: true }
    });
    if (!source) {
      return NextResponse.json({ error: 'Fuente de conocimiento no encontrada' }, { status: 404 });
    }

    const result = await updateTextThread(sourceId, title, text, category);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error updating text thread:', error);
    let msg = error.message || 'Error al actualizar el conocimiento';
    if (msg.includes('Incorrect API key')) msg = 'La clave de IA proporcionada no parece válida. Revísala en Ajustes para continuar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
