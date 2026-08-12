import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build-time'
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const commerceId = payload.commerceId as string;
    if (!commerceId) return NextResponse.json({ error: 'Comercio no asociado' }, { status: 400 });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const textContent = buffer.toString('utf-8');
    
    // Muestra de los primeros 5000 caracteres
    const sampleText = textContent.slice(0, 5000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto en diseño conversacional. Analiza el historial de chat que se te proporciona. Extrae el tono de voz de la empresa (o del agente comercial), incluyendo el nivel de formalidad, uso de emojis, tipo de saludo/despedida, longitud de respuestas, y cómo maneja las consultas. Redacta UN ÚNICO 'System Prompt' en primera persona para que una IA lo use y suene exactamente igual que este negocio. Debe ser directo y conciso, sin preámbulos. Por ejemplo: 'Eres el asistente de la Tienda X. Responde siempre con emojis de forma amigable y desenfadada, usando respuestas cortas...'."
        },
        {
          role: "user",
          content: `Historial de chat (muestra):\n\n${sampleText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const suggestedPrompt = completion.choices[0].message.content?.trim() || "";

    // Actualizamos la DB para el comercio autenticado
    await prisma.commerce.update({
      where: { id: commerceId },
      data: { systemPrompt: suggestedPrompt }
    });

    return NextResponse.json({ success: true, prompt: suggestedPrompt });
  } catch (error: any) {
    console.error('Error generating tone:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
