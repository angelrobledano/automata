"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const knowledge_resolver_1 = require("./rag/knowledge-resolver");
const quality_layer_1 = require("./rag/quality-layer");
const index_1 = require("./rag/index");
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || 'sk-fake-key-for-build-time',
});
async function generateAIResponse(commerce, customerPhone, messageHistory, sessionId) {
    const lastUserMsg = [...messageHistory].reverse().find(m => m.role === 'user')?.content || '';
    try {
        // 1. Knowledge Data Layer: Determinación determinista de hechos vigentes
        const resolvedFacts = await (0, knowledge_resolver_1.resolveApplicableFacts)(commerce.id, lastUserMsg);
        // 2. Hybrid RAG (recuperación de documentos)
        const ragChunks = await (0, index_1.searchSimilarChunks)(commerce.id, lastUserMsg, 3);
        const businessContextPrompt = [
            `Empresa: ${commerce.name || 'Mi Negocio'}`,
            commerce.address ? `Dirección: ${commerce.address}` : null,
            commerce.businessHours ? `Horarios habituales: ${commerce.businessHours}` : null,
            commerce.systemPrompt ? `Estilo conversacional y tono:\n${commerce.systemPrompt}` : null
        ].filter(Boolean).join('\n');
        // 3. Response Generation + Response Quality Layer + Auditoría
        const validatedResponse = await (0, quality_layer_1.generateValidatedResponse)({
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
    }
    catch (error) {
        console.error('[OpenAI] Error generando respuesta validada:', error);
        throw error;
    }
}
//# sourceMappingURL=ai.js.map