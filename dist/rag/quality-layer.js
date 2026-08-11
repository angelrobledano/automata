"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResponseQuality = validateResponseQuality;
exports.generateValidatedResponse = generateValidatedResponse;
const openai_1 = __importDefault(require("openai"));
const prisma_1 = require("../db/prisma");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build-time',
});
/**
 * 1. RESPONSE QUALITY LAYER: VALIDACIÓN POST-GENERACIÓN
 */
function validateResponseQuality(response, resolvedFacts) {
    const failures = [];
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
    // 2. VALIDACIÓN DE CONTRADICCIÓN DE HORARIOS Y MEZCLA DE REGLAS (OUTDATED_RULE_MIX)
    if (resolvedFacts.overriddenRuleNames.includes('Horario habitual')) {
        const mentionsRegularEnd = resLower.includes('20:00');
        const mentionsSummerSlots = resLower.includes('19:30') || resLower.includes('21:30') || resLower.includes('14:00');
        if (mentionsRegularEnd && mentionsSummerSlots) {
            failures.push('CONTRADICTION_DETECTED');
        }
        if (mentionsRegularEnd && !mentionsSummerSlots) {
            failures.push('OUTDATED_RULE_MIX');
        }
    }
    let feedback = '';
    if (failures.includes('CONTRADICTION_DETECTED')) {
        feedback += ' Has mezclado el horario habitual (20:00) con el horario de verano (19:30-21:30). El horario habitual está totalmente anulado por el de verano. NUNCA menciones 20:00 cuando el horario de verano esté activo.';
    }
    if (failures.includes('OUTDATED_RULE_MIX')) {
        feedback += ' Has utilizado el horario habitual antiguo en lugar del horario de verano actualmente vigente.';
    }
    if (failures.includes('UNSUPPORTED_CLAIMS')) {
        feedback += ' Afirmas que la tienda está abierta pero para esa fecha existe un festivo/cierre total.';
    }
    return {
        passed: failures.length === 0,
        failures,
        feedback
    };
}
/**
 * 2. FLUJO COMPLETO CON AUTO-REGENERACIÓN Y AUDITORÍA INMUTABLE
 */
async function generateValidatedResponse(params) {
    const { commerceId, sessionId, userQuestion, systemPrompt, messageHistory, resolvedFacts, ragChunks, aiModel = 'gpt-4o-mini', temperature = 0.2 } = params;
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
    const baseInstructions = `
${systemPrompt}

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
  `.trim();
    const messages = [
        { role: 'system', content: baseInstructions },
        ...messageHistory,
        { role: 'user', content: userQuestion }
    ];
    let currentResponse = '';
    let validation = { passed: true, failures: [], feedback: '' };
    let regenerationCount = 0;
    const maxRetries = 2;
    while (regenerationCount <= maxRetries) {
        const response = await openai.chat.completions.create({
            model: aiModel,
            messages: messages,
            temperature: temperature,
            max_tokens: 400
        });
        currentResponse = response.choices[0]?.message?.content || '';
        validation = validateResponseQuality(currentResponse, resolvedFacts);
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
async function saveAuditLog(data) {
    try {
        await prisma_1.prisma.responseAuditLog.create({
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
    }
    catch (err) {
        console.error('Error saving ResponseAuditLog:', err);
    }
}
//# sourceMappingURL=quality-layer.js.map