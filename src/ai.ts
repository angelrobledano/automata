import OpenAI from 'openai';
import dotenv from 'dotenv';
import { Commerce } from '@prisma/client';
import { resolveApplicableFacts } from './rag/knowledge-resolver';
import { generateValidatedResponse } from './rag/quality-layer';
import { searchSimilarChunks } from './rag/index';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build-time',
});

export async function generateAIResponse(
  commerce: Commerce, 
  customerPhone: string,
  messageHistory: { role: 'user' | 'assistant' | 'system', content: string | null }[],
  sessionId?: string
) {
  const lastUserMsg = [...messageHistory].reverse().find(m => m.role === 'user')?.content || '';

  try {
    // 1. Knowledge Data Layer: Determinación determinista de hechos vigentes
    const resolvedFacts = await resolveApplicableFacts(commerce.id, lastUserMsg);

    // 2. Hybrid RAG (recuperación de documentos)
    const ragChunks = await searchSimilarChunks(commerce.id, lastUserMsg, 3);

    const businessContextPrompt = [
      `Empresa: ${commerce.name || 'Mi Negocio'}`,
      commerce.address ? `Dirección: ${commerce.address}` : null,
      commerce.businessHours ? `Horarios habituales: ${commerce.businessHours}` : null,
      commerce.systemPrompt ? `Estilo conversacional y tono:\n${commerce.systemPrompt}` : null,
      // Reglas de Diseño Conversacional
      `REGLAS DE FORMATO CONVERSACIONAL:
- Máximo 3 líneas por párrafo. Usa saltos de línea entre bloques.
- Si el cliente hace varias preguntas en un mensaje, responde cada una en un bloque separado con un salto de línea entre ellos.
- Usa *negrita* para destacar datos clave (precios, horarios, direcciones).
- Emojis con moderación: máximo 2 por respuesta, solo si aportan claridad.
- Termina siempre con una pregunta de continuidad o sugerencia de acción clara.
- Si ofreces opciones al cliente, márcalas con viñetas simples (•).
- NUNCA generes párrafos de más de 3 líneas ni listas interminables.`
    ].filter(Boolean).join('\n');

    // 3. Response Generation + Response Quality Layer + Auditoría
    const validatedResponse = await generateValidatedResponse({
      commerceId: commerce.id,
      sessionId: sessionId ?? null,
      userQuestion: lastUserMsg,
      systemPrompt: businessContextPrompt,
      messageHistory: messageHistory.map(m => ({ role: m.role, content: m.content || '' })),
      resolvedFacts,
      ragChunks,
      aiModel: commerce.aiModel || 'gpt-4o-mini',
      temperature: commerce.aiTemperature || 0.2
    });

    return validatedResponse;
  } catch (error) {
    console.error('[OpenAI] Error generando respuesta validada:', error);
    throw error;
  }
}
