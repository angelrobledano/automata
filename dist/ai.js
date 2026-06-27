"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const woocommerce_1 = require("./integrations/woocommerce");
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
        { role: 'system', content: commerce.systemPrompt },
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
        const responseMessage = response.choices[0].message;
        // Verificar si la IA decidió usar la herramienta (crear el pedido)
        if (responseMessage.tool_calls) {
            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type === 'function' && toolCall.function.name === 'confirm_and_create_order') {
                    const args = JSON.parse(toolCall.function.arguments);
                    console.log(`[AI] LLamada a función detectada: confirm_and_create_order`, args);
                    try {
                        // Pasamos los datos extraídos a WooCommerce
                        const orderId = await (0, woocommerce_1.createWooCommerceOrder)(commerce.wooUrl, commerce.wooConsumerKey, commerce.wooConsumerSecret, {
                            customer_name: args.customer_name,
                            customer_phone: customerPhone,
                            items: args.items,
                            pickup_time: args.pickup_time,
                            notes: args.notes || '',
                        });
                        return `¡Perfecto! Tu pedido ha sido confirmado y enviado a tienda. El identificador de tu pedido es el #${orderId}. ¡Gracias por confiar en nosotros!`;
                    }
                    catch (error) {
                        return 'Hubo un problema al registrar tu pedido en nuestro sistema. Por favor, dínoslo en un momento e intentaremos de nuevo.';
                    }
                }
            }
        }
        return responseMessage.content || '';
    }
    catch (error) {
        console.error('[OpenAI] Error generando respuesta:', error);
        throw error;
    }
}
//# sourceMappingURL=ai.js.map