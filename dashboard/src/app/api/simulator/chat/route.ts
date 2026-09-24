import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/jwt';
import { readCookieValue } from '../../../../../../src/utils/jwt';
import { resolveApplicableFacts } from '../../../../../../src/rag/knowledge-resolver';
import { searchSimilarChunks } from '../../../../../../src/rag/index';
import { generateValidatedResponse } from '../../../../../../src/rag/quality-layer';

/**
 * B-26: el simulador usa la MISMA IA que producción (resolver determinista +
 * RAG híbrido + quality layer) y el commerce del JWT — antes usaba un prompt
 * genérico con commerceId fijo, mintiendo sobre lo que respondería el bot real.
 * Sin persistencia: es una simulación efímera (la auditoría de respuestas sí
 * queda registrada, como en producción).
 */
export async function POST(request: Request) {
  try {
    const token = readCookieValue(request.headers.get('cookie'), 'token');
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const commerceId = payload.commerceId as string;

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMessage?.content) {
      return NextResponse.json({ error: 'Se necesita al menos un mensaje del usuario' }, { status: 400 });
    }

    const commerce = await import('../../../../../../src/db/prisma').then(m => m.prisma.commerce.findUnique({
      where: { id: commerceId },
      select: { id: true, name: true, systemPrompt: true, aiModel: true, aiTemperature: true, businessHours: true }
    }));
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    // Pipeline real (idéntico al worker, sin historial de sesión)
    const resolvedFacts = await resolveApplicableFacts(commerceId, lastUserMessage.content);
    const ragChunks = await searchSimilarChunks(commerceId, lastUserMessage.content, 3);

    const generation = await generateValidatedResponse({
      commerceId,
      sessionId: null,
      customerPhone: 'Simulador',
      userQuestion: lastUserMessage.content,
      systemPrompt: commerce.systemPrompt ?? '',
      messageHistory: [],
      resolvedFacts,
      ragChunks,
      aiModel: commerce.aiModel || 'gpt-4o-mini',
      temperature: commerce.aiTemperature || 0.2
    });

    return NextResponse.json({
      success: true,
      message: {
        role: 'assistant',
        content: generation.response,
        tokensUsed: generation.usage.totalTokens,
        estimatedCost: generation.usage.estimatedCostUsd
      }
    });
  } catch (error: any) {
    console.error('Error in simulator chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
