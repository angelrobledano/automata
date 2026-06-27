import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '../../../../../../src/db/prisma';
import { searchSimilarChunks } from '../../../../../../src/rag/index';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const commerceId = payload.commerceId as string;
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const startTime = Date.now();

    // 1. Obtener Configuración del Comercio
    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId }
    });

    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // 2. Obtener o crear sesión de prueba (Simulator Session)
    let session = await prisma.session.findFirst({
      where: { commerceId, isTest: true },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!session) {
      // Find or create a WEBCHAT channel connection for the simulator
      let webConnection = await prisma.channelConnection.findFirst({
        where: { commerceId, provider: 'WEBCHAT' }
      });
      if (!webConnection) {
        webConnection = await prisma.channelConnection.create({
          data: {
            commerceId,
            provider: 'WEBCHAT',
            status: 'CONNECTED',
            channelAccountId: 'simulator',
          }
        });
      }

      session = await prisma.session.create({
        data: {
          commerceId,
          channelConnectionId: webConnection.id,
          customerIdentifier: 'simulator-user',
          status: 'ACTIVE',
          isTest: true
        },
        include: { messages: true }
      });
    }

    // 3. Guardar el mensaje del usuario
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message
      }
    });

    // 4. RAG: Buscar contexto relevante en la base de datos de conocimiento
    const relevantChunks = await searchSimilarChunks(commerceId, message, 3);
    const contextStr = relevantChunks.map(c => `[Fuente: ${c.sourcename || 'Desconocida'}]\n${c.content}`).join('\n\n');

    // 5. Construir el Prompt
    const systemMessage = `
${commerce.systemPrompt}

INFORMACIÓN DE CONTEXTO (Usa esta información para responder):
${contextStr || 'No hay información adicional disponible.'}

REGLA ESTRICTA DE SEGURIDAD: Eres un asistente exclusivo de esta tienda. BAJO NINGÚN CONCEPTO debes responder a preguntas de cultura general, matemáticas, programación, historia, curiosidades u otros temas que no estén estrictamente relacionados con los productos, horarios, o servicios de la tienda. Si el usuario hace una pregunta fuera de esta temática, o si la información no está en el contexto, responde amablemente diciendo que solo puedes ayudar con temas relacionados con la tienda y sus productos, y no inventes datos.
    `.trim();

    const openaiMessages = [
      { role: 'system', content: systemMessage },
      ...session.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ] as any[];

    // 6. Llamar a OpenAI con Streaming y trackeo de uso
    const response = await openai.chat.completions.create({
      model: commerce.aiModel || 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: commerce.aiTemperature || 0.7,
      max_tokens: commerce.aiMaxTokens || 500,
      stream: true,
      stream_options: { include_usage: true }
    });

    // 7. Configurar el stream para el cliente
    const encoder = new TextEncoder();
    let fullContent = '';
    let usage: any = null;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              controller.enqueue(encoder.encode(content));
            }
            if (chunk.usage) {
              usage = chunk.usage;
            }
          }
          
          // Al terminar el stream, guardar el mensaje y métricas en BD asíncronamente
          const latencyMs = Date.now() - startTime;
          const tokensUsed = usage?.total_tokens || 0;
          
          // Estimación burda de coste (ej. gpt-4o-mini: $0.15/1M input, $0.60/1M output)
          // Se simplifica calculando un coste aproximado total
          const costPerToken = commerce.aiModel.includes('mini') ? 0.0000003 : 0.00001; 
          const estimatedCost = tokensUsed * costPerToken;

          await prisma.message.create({
            data: {
              sessionId: session!.id,
              role: 'assistant',
              content: fullContent,
              tokensUsed,
              latencyMs,
              estimatedCost
            }
          });

          // Enviar los metadatos finales al cliente en un formato especial al final del stream
          const metadata = JSON.stringify({
            __metadata: {
              latencyMs,
              tokensUsed,
              estimatedCost,
              promptTokens: usage?.prompt_tokens,
              completionTokens: usage?.completion_tokens,
              model: commerce.aiModel,
              contextUsed: relevantChunks.length
            }
          });
          controller.enqueue(encoder.encode(`\n\n[METADATA]${metadata}`));

          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // Limpiar sesión de prueba
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const commerceId = payload.commerceId as string;

    const session = await prisma.session.findFirst({ where: { commerceId, isTest: true } });
    if (session) {
      await prisma.message.deleteMany({ where: { sessionId: session.id } });
      await prisma.session.delete({ where: { id: session.id } });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
