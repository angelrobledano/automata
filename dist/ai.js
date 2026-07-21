"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const tools = [
    {
        type: 'function',
        function: {
            name: 'confirm_and_create_order',
            description: 'Llamar a esta función SOLO cuando el cliente final haya aceptado el resumen del pedido y tengas todos los datos necesarios.',
            parameters: {
                type: 'object',
                properties: {
                    customer_name: { type: 'string', description: 'Nombre del cliente' },
                    items: { type: 'array', items: { type: 'string' }, description: 'Lista de artículos pedidos con sus cantidades' },
                    pickup_time: { type: 'string', description: 'Fecha y hora acordada para la recogida o entrega' },
                    notes: { type: 'string', description: 'Cualquier nota adicional, alergia o personalización' },
                },
                required: ['customer_name', 'items', 'pickup_time'],
            },
        },
    },
];
async function generateAIResponse(commerce, customerPhone, messageHistory) {
    const messages = [
        { role: 'system', content: commerce.systemPrompt ?? '' },
        ...messageHistory,
    ];
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            tools: tools,
            tool_choice: 'auto',
            temperature: 0.2,
        });
        const responseMessage = response.choices[0]?.message;
        if (!responseMessage)
            throw new Error('No response from OpenAI');
        // Eliminar la invocación a WooCommerce por ahora, ya que refactorizamos Commerce
        // En el futuro, recuperaremos esta configuración de un modelo de Integraciones de E-Commerce.
        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type === 'function' && toolCall.function.name === 'confirm_and_create_order') {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log(`[AI] LLamada a función detectada: confirm_and_create_order`, args);
                    return `¡Perfecto! He recibido tu pedido. Próximamente habilitaremos la pasarela de pedidos. ¡Gracias!`;
                }
            }
        }
        return responseMessage.content ?? '';
    }
    catch (error) {
        console.error('[OpenAI] Error generando respuesta:', error);
        throw error;
    }
}
//# sourceMappingURL=ai.js.map