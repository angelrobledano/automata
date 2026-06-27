import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: {
      findUnique: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    knowledgeSource: {
      count: vi.fn(),
    },
    insight: {
      findMany: vi.fn(),
      create: vi.fn(),
    }
  }
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'fake-token' }))
  }))
}));

vi.mock('../../../../lib/jwt', () => ({
  verifyToken: vi.fn(() => ({ commerceId: 'comm-123' }))
}));

describe('Metrics API GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (period = '7d') => {
    return new Request(`http://localhost/api/metrics?period=${period}`);
  };

  it('should return aggregated cost and tokens', async () => {
    const { prisma } = await import('../../../../../../src/db/prisma');
    (prisma.commerce.findUnique as any).mockResolvedValue({ id: 'comm-123' });
    (prisma.knowledgeSource.count as any).mockResolvedValue(0);
    (prisma.insight.findMany as any).mockResolvedValue([]);
    (prisma.insight.create as any).mockResolvedValue({ id: 'mock-insight' });

    (prisma.session.findMany as any).mockResolvedValue([
      {
        id: 'sess-1',
        status: 'ACTIVE',
        messages: [
          { role: 'user', content: 'hello', createdAt: new Date() },
          { role: 'assistant', content: 'hi', createdAt: new Date(), tokensUsed: 100, estimatedCost: 0.0001 },
          { role: 'assistant', content: 'there', createdAt: new Date(), tokensUsed: 50, estimatedCost: 0.00005 },
        ]
      }
    ]);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.totalTokens).toBe(150);
    // Floating point math issues in JS, check proximity
    expect(data.totalCost).toBeCloseTo(0.00015, 5);
    // Should not have the old mocked variables
    expect(data.salesGenerated).toBeUndefined();
    expect(data.setupProgress).toBeUndefined();
  });
});
