import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { searchSimilarChunks } from '../../../../../../src/rag/index';
import { resolveApplicableFacts } from '../../../../../../src/rag/knowledge-resolver';
import { generateValidatedResponse } from '../../../../../../src/rag/quality-layer';

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

    // 3. Guardar mensaje del usuario
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message
      }
    });

    // 4. KNOWLEDGE DATA LAYER: Resolución determinista de hechos vigentes
    const resolvedFacts = await resolveApplicableFacts(commerceId, message);

    // 5. HYBRID RAG: Búsqueda de documentos contextuales
    const relevantChunks = await searchSimilarChunks(commerceId, message, 3);

    // 6. RESPONSE GENERATION & QUALITY LAYER
    const messageHistory = session.messages.map(m => ({ role: m.role, content: m.content }));
    const finalReply = await generateValidatedResponse({
      commerceId,
      sessionId: session.id,
      userQuestion: message,
      systemPrompt: commerce.systemPrompt ?? '',
      messageHistory,
      resolvedFacts,
      ragChunks: relevantChunks,
      aiModel: commerce.aiModel || 'gpt-4o-mini',
      temperature: commerce.aiTemperature || 0.2
    });

    const latencyMs = Date.now() - startTime;
    const tokensUsed = Math.round(finalReply.length * 1.3);
    const estimatedCost = tokensUsed * 0.0000003;

    // 7. Guardar el mensaje devuelto en sesión
    await prisma.message.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: finalReply,
        tokensUsed,
        latencyMs,
        estimatedCost
      }
    });

    return NextResponse.json({
      success: true,
      reply: finalReply,
      metadata: {
        latencyMs,
        tokensUsed,
        estimatedCost,
        model: commerce.aiModel,
        resolvedIntent: resolvedFacts.intent,
        activeRule: resolvedFacts.activeRules[0]?.name || 'Ninguna',
        overriddenRules: resolvedFacts.overriddenRuleNames,
        isClosed: resolvedFacts.isClosed
      }
    });

  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
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
