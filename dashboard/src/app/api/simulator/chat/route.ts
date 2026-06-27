import { NextResponse } from 'next/server';
import { LLMService } from '../../../../services/llm.service';
import { RagService } from '../../../../services/rag.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const commerceId = 'commerce-seed-id'; // Simulator always uses the demo commerce
    
    let ragContext = '';
    if (lastUserMessage) {
      ragContext = await RagService.retrieveContext(commerceId, lastUserMessage.content);
    }

    const finalContext = (context || '') + ragContext;

    const llmResponse = await LLMService.generateChatResponse(messages, finalContext);

    return NextResponse.json({ 
      success: true, 
      message: { 
        role: 'assistant', 
        content: llmResponse.content,
        tokensUsed: llmResponse.tokensUsed,
        estimatedCost: llmResponse.estimatedCost
      } 
    });
  } catch (error: any) {
    console.error('Error in simulator chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
