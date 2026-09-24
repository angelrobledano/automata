import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

/**
 * B-26: el simulador usa el pipeline REAL de IA con el commerce del JWT y
 * exige sesión (antes: prompt genérico con commerceId fijo y API pública).
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../../src/utils/jwt', () => ({
  readCookieValue: vi.fn((cookieHeader: string | null, name: string) => {
    if (!cookieHeader) return null;
    const match = cookieHeader.split(';').map((c: string) => c.trim()).find((c: string) => c.startsWith(`${name}=`));
    return match ? match.slice(name.length + 1) : null;
  }),
}));

vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: { findUnique: vi.fn() },
  },
}));

vi.mock('../../../../../../../src/rag/knowledge-resolver', () => ({
  resolveApplicableFacts: vi.fn(),
}));

vi.mock('../../../../../../../src/rag/index', () => ({
  searchSimilarChunks: vi.fn(),
}));

vi.mock('../../../../../../../src/rag/quality-layer', () => ({
  generateValidatedResponse: vi.fn(),
}));

import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../../../src/db/prisma';
import { resolveApplicableFacts } from '../../../../../../../src/rag/knowledge-resolver';
import { searchSimilarChunks } from '../../../../../../../src/rag/index';
import { generateValidatedResponse } from '../../../../../../../src/rag/quality-layer';

const createMockRequest = (body: any, cookieToken: string | null = 'valid_token') => {
  const req = new Request('http://localhost/api/simulator/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookieToken ? { cookie: `token=${cookieToken}` } : {}) } as any,
  });
  return req;
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.commerce.findUnique as any).mockResolvedValue({
    id: 'commerce-123', name: 'Mi Tienda', systemPrompt: 'Eres un asistente.',
    aiModel: 'gpt-4o-mini', aiTemperature: 0.2, businessHours: null,
  });
  (resolveApplicableFacts as any).mockResolvedValue({ intent: 'GENERAL_INQUIRY', activeRules: [], resolvedFactsText: '' });
  (searchSimilarChunks as any).mockResolvedValue([]);
  (generateValidatedResponse as any).mockResolvedValue({
    response: 'Respuesta de la IA real',
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, estimatedCostUsd: 0.0001, latencyMs: 500, model: 'gpt-4o-mini' },
  });
});

describe('Simulator Chat API POST (B-26)', () => {
  it('devuelve 401 sin sesión (la API de coste ya no es pública)', async () => {
    (verifyToken as any).mockResolvedValue(null);
    const res = await POST(createMockRequest({ messages: [{ role: 'user', content: 'Hola' }] }, null));
    expect(res.status).toBe(401);
    expect(generateValidatedResponse).not.toHaveBeenCalled();
  });

  it('devuelve 400 si no hay mensajes', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    const res = await POST(createMockRequest({}));
    expect(res.status).toBe(400);
  });

  it('usa el pipeline REAL con el commerce del JWT (no un prompt genérico)', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });

    const res = await POST(createMockRequest({
      messages: [{ role: 'user', content: 'Hola, ¿tienes camisetas negras?' }]
    }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message.role).toBe('assistant');
    expect(data.message.content).toBe('Respuesta de la IA real');
    expect(data.message.tokensUsed).toBe(150);
    expect(data.message.estimatedCost).toBe(0.0001);

    // Resolver + RAG + quality-layer con el commerce del JWT
    expect(resolveApplicableFacts).toHaveBeenCalledWith('commerce-123', 'Hola, ¿tienes camisetas negras?');
    expect(searchSimilarChunks).toHaveBeenCalledWith('commerce-123', 'Hola, ¿tienes camisetas negras?', 3);
    expect(generateValidatedResponse).toHaveBeenCalledWith(expect.objectContaining({ commerceId: 'commerce-123' }));
  });
});
