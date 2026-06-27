import OpenAI from 'openai';

const provider = process.env.LLM_PROVIDER || 'openai';
const apiKey = provider === 'ollama' ? 'ollama' : (process.env.OPENAI_API_KEY || 'sk-test');
const baseURL = provider === 'ollama' ? (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1') : undefined;

export const openai = new OpenAI({
  apiKey,
  baseURL,
});

export const getModelName = () => {
  if (provider === 'ollama') {
    return process.env.OLLAMA_MODEL || 'gemma';
  }
  return 'gpt-4o-mini';
};

export class LLMService {
  static async generateChatResponse(messages: any[], context?: string) {
    const systemMessage = {
      role: 'system',
      content: `Eres un asistente virtual de ventas y soporte para una tienda online.
      
Reglas principales:
1. Responde de forma amable, clara y concisa.
2. Si el usuario hace preguntas sobre la tienda o productos, usa la información de contexto proporcionada.
3. Si no sabes la respuesta, dilo educadamente y ofrece contactar con un humano.

Contexto activo de la tienda:
${context || 'No hay contexto adicional.'}`
    };

    const formattedMessages = [systemMessage, ...messages.map(m => ({
      role: m.role,
      content: m.content
    }))];

    const model = getModelName();

    try {
      const completion = await openai.chat.completions.create({
        model,
        messages: formattedMessages,
        temperature: 0.3,
      });

      const responseMessage = completion.choices[0]?.message?.content || 'Lo siento, no pude procesar esa solicitud.';
      const usage = completion.usage;

      // Ollama returns usage differently sometimes or zero, but we try to capture it
      return {
        content: responseMessage,
        tokensUsed: usage?.total_tokens || 0,
        // Very rough cost estimate (Ollama is 0, but we can simulate a cost to see it on dashboard if wanted, or leave 0)
        estimatedCost: provider === 'ollama' ? 0 : ((usage?.total_tokens || 0) * 0.0000004) 
      };
    } catch (error: any) {
      console.error('LLM Generation error:', error);
      throw new Error('No se pudo conectar con el motor de IA. Verifica que Ollama esté arrancado o tu API Key sea válida.');
    }
  }
}
