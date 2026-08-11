import { NextResponse } from 'next/server';
import { addTextThread, updateTextThread } from '../../../../../../src/rag/index';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    const body = await request.json();
    let commerceId = body.commerceId;

    if (!commerceId && token) {
      const payload = await verifyToken(token);
      if (payload && payload.commerceId) {
        commerceId = payload.commerceId as string;
      }
    }

    if (!commerceId) {
      commerceId = 'commerce-seed-id';
    }

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
    const body = await request.json();
    const { sourceId, title, text, category } = body;

    if (!sourceId || !title || !text) {
      return NextResponse.json({ error: 'Faltan campos obligatorios para actualizar' }, { status: 400 });
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
