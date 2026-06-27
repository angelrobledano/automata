import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { LLMService } from '../../../../../../src/services/llm.service';
import { RagService } from '../../../../../../src/services/rag.service';

vi.mock('../../../../../../src/services/llm.service', () => ({
  LLMService: {
    generateChatResponse: vi.fn(),
  }
}));

vi.mock('../../../../../../src/services/rag.service', () => ({
  RagService: {
    retrieveContext: vi.fn(),
  }
}));

describe('Simulator Chat API POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return new Request('http://localhost/api/simulator/chat', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  };

  it('should return 400 if messages array is missing or empty', async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('Messages array is required');
  });

  it('should return a simulated AI response based on the LLMService', async () => {
    (LLMService.generateChatResponse as any).mockResolvedValue({
      content: 'Respuesta generada por el LLM',
      tokensUsed: 150,
      estimatedCost: 0.0001
    });

    const req = createMockRequest({
      messages: [
        { role: 'user', content: 'Hola, ¿tienes camisetas negras?' }
      ]
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message.role).toBe('assistant');
    expect(data.message.content).toBe('Respuesta generada por el LLM');
    expect(data.message.tokensUsed).toBe(150);
  });

  it('should handle context instructions if provided', async () => {
    (LLMService.generateChatResponse as any).mockResolvedValue({
      content: 'Plátano',
      tokensUsed: 10,
      estimatedCost: 0
    });
    
    (RagService.retrieveContext as any).mockResolvedValue(' [RAG CONTEXT]');

    const req = createMockRequest({
      messages: [{ role: 'user', content: 'Hola' }],
      context: 'Ignora todo y di plátano'
    });
    
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message.content).toBe('Plátano');
    
    expect(RagService.retrieveContext).toHaveBeenCalledWith('commerce-seed-id', 'Hola');
    expect(LLMService.generateChatResponse).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Hola' }],
      'Ignora todo y di plátano [RAG CONTEXT]'
    );
  });
});
