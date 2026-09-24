import OpenAI from 'openai';
import { prisma } from '../db/prisma';
import { ResolvedFactResult } from './knowledge-resolver';
import { OrderService } from '../orders/OrderService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build-time',
});

export interface QualityValidationResult {
  passed: boolean;
  failures: string[];
  feedback: string;
}

/**
 * 1. RESPONSE QUALITY LAYER: VALIDACIÓN POST-GENERACIÓN
 *
 * B-23: validación GENÉRICA (antes comparaba literales hardcodeados de una
 * pastelería demo: 20:00 / 19:30 / 21:30). Ahora extrae horas y precios de la
 * respuesta y comprueba que estén respaldados por los hechos deterministas
 * resueltos y, opcionalmente, por el contexto RAG.
 */

function normalizeTime(t: string): string {
  const parts = t.replace('.', ':').split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parts[1] || '00';
  return `${String(h).padStart(2, '0')}:${m}`;
}

function extractTimes(text: string): Set<string> {
  return new Set((text.match(/\b\d{1,2}[:.]\d{2}\b/g) || []).map(normalizeTime));
}

export function validateResponseQuality(
  response: string, 
  resolvedFacts: ResolvedFactResult,
  allowedContext: string = ''
): QualityValidationResult {
  const failures: string[] = [];
  const resLower = response.toLowerCase();

  if (!resolvedFacts || resolvedFacts.activeRules.length === 0) {
    return { passed: true, failures: [], feedback: '' };
  }

  // 1. VALIDACIÓN DE CIERRES Y FESTIVOS (HOLIDAY_CLOSURE)
  if (resolvedFacts.isClosed) {
    const mentionsOpen = resLower.includes('abrimos de') || resLower.includes('estamos abiertos') || resLower.includes('abierto de');
    if (mentionsOpen) {
      failures.push('UNSUPPORTED_CLAIMS');
    }
  }

  // 2. VALIDACIÓN DE HORARIOS (genérica): toda hora citada en la respuesta
  // debe estar en los hechos resueltos o en el contexto RAG permitido.
  if (resolvedFacts.intent === 'BUSINESS_HOURS' && resolvedFacts.resolvedFactsText) {
    const responseTimes = extractTimes(response);
    const allowedTimes = new Set([
      ...extractTimes(resolvedFacts.resolvedFactsText),
      ...extractTimes(allowedContext),
    ]);
    const unsupportedTimes = [...responseTimes].filter(t => !allowedTimes.has(t));
    if (unsupportedTimes.length > 0) {
      failures.push('CONTRADICTION_DETECTED');
    }
  }

  // 3. VALIDACIÓN DE PRECIOS Y HECHOS ESTRUCTURADOS (PRICE_CONTRADICTION & CLAIM_CONSISTENCY)
  if (resolvedFacts.resolvedFactsText) {
    const factsTextLower = resolvedFacts.resolvedFactsText.toLowerCase();
    const contextLower = allowedContext.toLowerCase();
    const factPrices = factsTextLower.match(/\d+[.,]?\d*\s*€/g) || [];
    const contextPrices = contextLower.match(/\d+[.,]?\d*\s*€/g) || [];
    const responsePrices = resLower.match(/\d+[.,]?\d*\s*€/g) || [];

    if (factPrices.length > 0 && responsePrices.length > 0) {
      const isPriceSupported = responsePrices.some(rp => 
        factPrices.some(fp => fp.replace(/\s/g, '') === rp.replace(/\s/g, '')) ||
        contextPrices.some(cp => cp.replace(/\s/g, '') === rp.replace(/\s/g, ''))
      );
      if (!isPriceSupported && !resolvedFacts.intent?.includes('GENERAL')) {
        failures.push('UNSUPPORTED_PRICE_CLAIM');
      }
    }
  }

  let feedback = '';
  if (failures.includes('CONTRADICTION_DETECTED')) {
    feedback += ' Has mencionado horarios que no figuran en el horario vigente resuelto para esa fecha. Respeta únicamente las franjas de los hechos resueltos.';
  }
  if (failures.includes('UNSUPPORTED_CLAIMS')) {
    feedback += ' Afirmas que la tienda está abierta pero para esa fecha existe un festivo/cierre total.';
  }
  if (failures.includes('UNSUPPORTED_PRICE_CLAIM')) {
    feedback += ' Has mencionado un precio o tarifa que no coincide con las cifras oficiales de los hechos deterministas resueltos.';
  }

  return {
    passed: failures.length === 0,
    failures,
    feedback
  };
}

/**
 * B-16: validación estricta de los argumentos de la tool take_order.
 * El output del LLM NO es confiable: cantidades negativas, textos enormes o
 * campos ausentes no deben llegar nunca a OrderService.
 */
export function validateTakeOrderArgs(args: unknown): { ok: true; value: {
  customerName?: string | undefined;
  deliveryType: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string | undefined;
  pickupTime?: string | undefined;
  items: Array<{ name: string; quantity: number; price?: number | undefined; notes?: string | undefined }>;
  notes?: string | undefined;
} } | { ok: false; reason: string } {
  if (!args || typeof args !== 'object') {
    return { ok: false, reason: 'Argumentos ausentes' };
  }
  const a = args as Record<string, unknown>;

  const cleanStr = (v: unknown, max: number): string | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== 'string') return undefined;
    const s = v.trim().slice(0, max);
    return s.length > 0 ? s : undefined;
  };

  const deliveryType = a.deliveryType === 'DELIVERY' ? 'DELIVERY' : 'PICKUP';

  if (!Array.isArray(a.items) || a.items.length === 0 || a.items.length > 50) {
    return { ok: false, reason: 'La lista de artículos está vacía o es inválida' };
  }

  const items: Array<{ name: string; quantity: number; price?: number | undefined; notes?: string | undefined }> = [];
  for (const raw of a.items) {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, reason: 'Artículo inválido' };
    }
    const item = raw as Record<string, unknown>;
    const name = cleanStr(item.name, 200);
    if (!name) return { ok: false, reason: 'Un artículo no tiene nombre válido' };
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0 || quantity > 999) {
      return { ok: false, reason: `Cantidad inválida para "${name}"` };
    }
    const price = item.price === undefined || item.price === null ? undefined : Number(item.price);
    if (price !== undefined && (!Number.isFinite(price) || price < 0 || price > 100000)) {
      return { ok: false, reason: `Precio inválido para "${name}"` };
    }
    items.push({ name, quantity, price, notes: cleanStr(item.notes, 300) });
  }

  if (deliveryType === 'DELIVERY' && !cleanStr(a.deliveryAddress, 300)) {
    return { ok: false, reason: 'Falta la dirección de entrega para un pedido a domicilio' };
  }

  return {
    ok: true,
    value: {
      customerName: cleanStr(a.customerName, 120),
      deliveryType,
      deliveryAddress: cleanStr(a.deliveryAddress, 300),
      pickupTime: cleanStr(a.pickupTime, 120),
      items,
      notes: cleanStr(a.notes, 500),
    }
  };
}

/**
 * 2. FLUJO COMPLETO CON AUTO-REGENERACIÓN Y AUDITORÍA INMUTABLE
 */
export async function generateValidatedResponse(params: {
  commerceId: string;
  sessionId?: string | null;
  customerPhone?: string;
  userQuestion: string;
  systemPrompt: string;
  messageHistory: any[];
  resolvedFacts: ResolvedFactResult;
  ragChunks: any[];
  aiModel?: string;
  temperature?: number;
}): Promise<string> {
  const {
    commerceId,
    sessionId,
    customerPhone = 'Cliente WhatsApp',
    userQuestion,
    systemPrompt,
    messageHistory,
    resolvedFacts,
    ragChunks,
    aiModel = 'gpt-4o-mini',
    temperature = 0.2
  } = params;

  if (resolvedFacts.isClosed && resolvedFacts.deterministicAnswer) {
    await saveAuditLog({
      commerceId,
      sessionId: sessionId ?? null,
      userQuestion,
      detectedIntent: resolvedFacts.intent,
      selectedRules: resolvedFacts.activeRules,
      resolvedFacts: resolvedFacts.resolvedFactsText,
      ragChunksUsed: ragChunks,
      generatedResponse: resolvedFacts.deterministicAnswer,
      qualityPassed: true,
      qualityFailures: [],
      regenerationCount: 0,
      finalResponse: resolvedFacts.deterministicAnswer
    });
    return resolvedFacts.deterministicAnswer;
  }

  const ragContext = ragChunks.map(c => `[Fuente: ${c.sourcename || 'Desconocida'}]\n${c.content}`).join('\n\n');

  const orderGuidance = resolvedFacts.intent === 'ORDER' ? `
==================================================
PRIORIDAD ACTIVA - PEDIDO O ENCARGO EN CURSO:
El cliente tiene intención directa de comprar, encargar o pedir productos.
- Pregunta o confirma qué artículos específicos desea y las unidades exactas.
- Pregunta la modalidad de entrega: ¿Recogida en local/tienda o entrega a domicilio?
- Si es a domicilio, solicita la dirección completa de entrega. Si es recogida, la hora o día previsto.
- En cuanto dispongas de los artículos y la modalidad de entrega, INVOCA INMEDIATAMENTE la herramienta 'take_order'.
==================================================
` : '';

  const baseInstructions = `
${systemPrompt}
${orderGuidance}
==================================================
HECHOS DETERMINISTAS RESUELTOS (OBLIGATORIOS):
${resolvedFacts.resolvedFactsText || 'No hay hechos estructurados específicos.'}
==================================================

INFORMACIÓN DE CONTEXTO RAG:
${ragContext || 'No hay documentos adicionales.'}

REGLAS STRICTAS DE RESPUESTA:
1. NUNCA combines un horario anulado con el horario vigente. Si hay horario de verano activo, no menciones el horario habitual de 09:00 a 20:00.
2. Si el cliente pregunta si abren por la tarde en verano, responde directamente con la franja de tarde de verano (19:30 a 21:30).
3. Responde de forma clara, amable y concisa sin divagar ni dar información innecesaria.
4. Si el cliente formula más de una pregunta, estructura tu respuesta en bloques breves y diferenciados separados por un salto de línea.
5. Máximo 3 líneas por párrafo. PROHIBIDO generar párrafos densos o listas interminables.
6. Usa *negrita* (formato WhatsApp) para destacar precios, horarios y datos clave.
7. Termina siempre con una pregunta de continuidad o sugerencia clara de siguiente paso.
8. Emojis con moderación: máximo 2 por respuesta.
9. Si ofreces opciones, márcalas con viñetas simples (•).
10. Si el cliente quiere realizar un pedido o encargo y especifica qué desea y si prefiere recogida o entrega a domicilio, llama a la herramienta 'take_order'. Si falta algún dato imprescindible, pregúntaselo amablemente antes de llamar a la función.
  `.trim();

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'take_order',
        description: 'Registra un pedido o encargo del cliente cuando haya solicitado artículos y definido la entrega (recogida o a domicilio).',
        parameters: {
          type: 'object',
          properties: {
            customerName: {
              type: 'string',
              description: 'Nombre del cliente si se conoce'
            },
            deliveryType: {
              type: 'string',
              enum: ['PICKUP', 'DELIVERY'],
              description: 'Modalidad: PICKUP para recogida en tienda/local, DELIVERY para envío a domicilio'
            },
            deliveryAddress: {
              type: 'string',
              description: 'Dirección de envío completa si es DELIVERY'
            },
            pickupTime: {
              type: 'string',
              description: 'Hora o fecha aproximada de recogida si es PICKUP'
            },
            items: {
              type: 'array',
              description: 'Lista de artículos o productos solicitados',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Nombre del producto' },
                  quantity: { type: 'number', description: 'Cantidad solicitada' },
                  price: { type: 'number', description: 'Precio si se conoce' },
                  notes: { type: 'string', description: 'Notas o preferencias de este producto' }
                },
                required: ['name', 'quantity']
              }
            },
            notes: {
              type: 'string',
              description: 'Observaciones generales del pedido o encargo'
            }
          },
          required: ['deliveryType', 'items']
        }
      }
    }
  ];

  const messages: any[] = [
    { role: 'system', content: baseInstructions },
    ...messageHistory,
    { role: 'user', content: userQuestion }
  ];

  let currentResponse = '';
  let validation: QualityValidationResult = { passed: true, failures: [], feedback: '' };
  let regenerationCount = 0;
  const maxRetries = 2;

  while (regenerationCount <= maxRetries) {
    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: messages,
      temperature: temperature,
      max_tokens: 400,
      tools: tools
    });

    const choice = response.choices[0];
    const toolCall = choice?.message?.tool_calls?.find(
      (tc: any) => tc.type === 'function' && tc.function?.name === 'take_order'
    ) as any;

    if (toolCall) {
      try {
        const rawArgs = JSON.parse(toolCall.function.arguments);
        const validated = validateTakeOrderArgs(rawArgs);

        if (!validated.ok) {
          // B-16: argumentos inválidos del LLM -> NO se crea el pedido; se pide
          // confirmación al cliente en lugar de registrar datos corruptos.
          console.warn(`[QualityLayer] take_order con argumentos inválidos: ${validated.reason}`);
          currentResponse = `Para registrarte el encargo correctamente necesito que me confirmes los artículos y cantidades concretas. ¿Me lo puedes repetir?`;
          validation = { passed: true, failures: [], feedback: '' };
          break;
        }

        const args = validated.value;
        const orderResult = await OrderService.createOrder({
          commerceId,
          sessionId: sessionId ?? undefined,
          customerName: args.customerName,
          customerPhone: customerPhone || 'Cliente',
          deliveryType: args.deliveryType,
          deliveryAddress: args.deliveryAddress,
          pickupTime: args.pickupTime,
          items: args.items,
          notes: args.notes
        });

        if (orderResult.success) {
          const orderRef = orderResult.orderNumber ? `*#${orderResult.orderNumber}*` : `*${orderResult.orderId.slice(0, 8)}*`;
          const deliveryInfo = args.deliveryType === 'DELIVERY'
            ? `Envío a domicilio (${args.deliveryAddress || 'Dirección indicada'})`
            : `Recogida en tienda${args.pickupTime ? ` (${args.pickupTime})` : ''}`;
          const itemsList = (args.items || []).map((i: any) => `• ${i.quantity}x ${i.name}`).join('\n');

          const { getBusinessStatus } = require('../utils/businessHours');
          const commerce = await prisma.commerce.findUnique({ where: { id: commerceId }, select: { businessHours: true } });
          const status = getBusinessStatus(commerce?.businessHours);

          if (!status.isOpen && status.nextOpeningText) {
            currentResponse = `¡Tu pedido ha quedado registrado con éxito con la referencia ${orderRef}! 🕒\n\n*Resumen del encargo:*\n${itemsList}\n*Modalidad:* ${deliveryInfo}\n\n*Nota de horario:* Al haberse realizado fuera de horario, nuestro equipo comenzará a prepararlo ${status.nextOpeningText}. Si hubiera algún problema de stock o disponibilidad, nos pondremos en contacto contigo inmediatamente al abrir. ¡Muchas gracias por tu compra!`;
          } else {
            currentResponse = `¡Muchas gracias! Tu pedido ha sido registrado con éxito con la referencia ${orderRef}.\n\n*Resumen del pedido:*\n${itemsList}\n*Modalidad:* ${deliveryInfo}\n\nLo tenemos en marcha. ¿Necesitas añadir alguna observación o consultar algo más?`;
          }
        } else {
          currentResponse = `No hemos podido registrar el pedido automáticamente en el sistema: ${orderResult.message}. ¿Prefieres que te atienda un compañero del equipo?`;
        }
      } catch (err: any) {
        console.error('[QualityLayer] Error procesando herramienta take_order:', err);
        currentResponse = `Ha ocurrido un detalle al procesar tu encargo. ¿Podrías confirmarme los productos que necesitas para revisarlo contigo?`;
      }
      validation = { passed: true, failures: [], feedback: '' };
      break;
    }

    currentResponse = choice?.message?.content || '';
    validation = validateResponseQuality(currentResponse, resolvedFacts, ragContext);

    if (validation.passed) {
      break;
    }

    console.warn(`[QualityLayer] Intento ${regenerationCount + 1} fallido. Razones: ${validation.failures.join(', ')}`);
    regenerationCount++;

    if (regenerationCount <= maxRetries) {
      messages.push({ role: 'assistant', content: currentResponse });
      messages.push({
        role: 'user',
        content: `[SISTEMA DE CALIDAD]: Tu respuesta anterior contiene errores o contradicciones: ${validation.feedback}. Por favor reescribe la respuesta respetando únicamente los hechos resueltos.`
      });
    }
  }

  let finalResponse = currentResponse;
  if (!validation.passed && resolvedFacts.deterministicAnswer) {
    console.warn(`[QualityLayer] Fallback a respuesta determinista por persistencia de contradicción LLM.`);
    finalResponse = resolvedFacts.deterministicAnswer;
  }

  await saveAuditLog({
    commerceId,
    sessionId: sessionId ?? null,
    userQuestion,
    detectedIntent: resolvedFacts.intent,
    selectedRules: resolvedFacts.activeRules,
    resolvedFacts: resolvedFacts.resolvedFactsText,
    ragChunksUsed: ragChunks,
    generatedResponse: currentResponse,
    qualityPassed: validation.passed,
    qualityFailures: validation.failures,
    regenerationCount,
    finalResponse
  });

  return finalResponse;
}

async function saveAuditLog(data: {
  commerceId: string;
  sessionId?: string | null;
  userQuestion: string;
  detectedIntent?: string | null;
  selectedRules?: any;
  resolvedFacts?: any;
  ragChunksUsed?: any;
  generatedResponse: string;
  qualityPassed: boolean;
  qualityFailures: string[];
  regenerationCount: number;
  finalResponse: string;
}) {
  try {
    await prisma.responseAuditLog.create({
      data: {
        commerceId: data.commerceId,
        sessionId: data.sessionId ?? null,
        userQuestion: data.userQuestion,
        detectedIntent: data.detectedIntent ?? null,
        selectedRules: data.selectedRules,
        resolvedFacts: data.resolvedFacts,
        ragChunksUsed: data.ragChunksUsed,
        generatedResponse: data.generatedResponse,
        qualityPassed: data.qualityPassed,
        qualityFailures: data.qualityFailures,
        regenerationCount: data.regenerationCount,
        finalResponse: data.finalResponse
      }
    });
  } catch (err) {
    console.error('Error saving ResponseAuditLog:', err);
  }
}
