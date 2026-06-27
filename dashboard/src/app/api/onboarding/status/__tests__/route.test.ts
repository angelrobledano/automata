import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock dependencies
vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: {
      findUnique: vi.fn(),
    },
    knowledgeSource: {
      count: vi.fn(),
    }
  }
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'fake-token' }))
  }))
}));
vi.mock('../../../../../lib/jwt', () => ({
  verifyToken: vi.fn(() => ({ commerceId: 'comm-123' }))
}));

describe('Onboarding Status API GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = () => {
    return new Request('http://localhost/api/onboarding/status');
  };

  it('should return 404 if commerce is not found', async () => {
    const { prisma } = await import('../../../../../../../src/db/prisma');
    (prisma.commerce.findUnique as any).mockResolvedValue(null);

    const req = createMockRequest();
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('should return 0% progress if nothing is configured', async () => {
    const { prisma } = await import('../../../../../../../src/db/prisma');
    (prisma.commerce.findUnique as any).mockResolvedValue({
      id: 'comm-123',
      waToken: null,
      wooConsumerKey: null
    });
    (prisma.knowledgeSource.count as any).mockResolvedValue(0);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.progress).toBe(0);
    expect(data.steps.knowledge).toBe(false);
    expect(data.steps.ecommerce).toBe(false);
    expect(data.steps.whatsapp).toBe(false);
  });

  it('should return 100% progress if everything is configured', async () => {
    const { prisma } = await import('../../../../../../../src/db/prisma');
    (prisma.commerce.findUnique as any).mockResolvedValue({
      id: 'comm-123',
      waToken: 'token',
      wooConsumerKey: 'key'
    });
    (prisma.knowledgeSource.count as any).mockResolvedValue(5);

    const req = createMockRequest();
    const res = await GET(req);
    const data = await res.json();

    expect(data.progress).toBe(100);
    expect(data.steps.knowledge).toBe(true);
    expect(data.steps.ecommerce).toBe(true);
    expect(data.steps.whatsapp).toBe(true);
  });
});
