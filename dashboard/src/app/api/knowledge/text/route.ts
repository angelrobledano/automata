import { NextResponse } from 'next/server';
import { addTextThread, updateTextThread } from '../../../../../../src/rag/index';
import { prisma } from '../../../../../../src/db/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const commerceId = body.commerceId || 'commerce-test-id';
    const { title, text, category } = body;

    if (!title || !text) {
      return NextResponse.json({ error: 'Falta título o texto' }, { status: 400 });
    }

    const result = await addTextThread(commerceId, title, text, category || "GENERAL");
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error creating text thread:', error);
    let msg = error.message;
    if (msg.includes('Incorrect API key')) msg = 'La clave de IA proporcionada no parece válida. Revísala en Ajustes para continuar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sourceId, title, text } = body;

    if (!sourceId || !title || !text) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const result = await updateTextThread(sourceId, title, text);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error updating text thread:', error);
    let msg = error.message;
    if (msg.includes('Incorrect API key')) msg = 'La clave de IA proporcionada no parece válida. Revísala en Ajustes para continuar.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
