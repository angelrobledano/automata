import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock dependencies
vi.mock('../../../../../../../../src/db/prisma', () => ({
  prisma: {
    knowledgeSource: {
      findFirst: vi.fn(),
    },
    documentChunk: {
      findMany: vi.fn(),
    }
  }
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'fake-token' }))
  }))
}));
vi.mock('../../../../../../lib/jwt', () => ({
  verifyToken: vi.fn(() => ({ commerceId: 'comm-123' }))
}));

describe('Knowledge Chunks API GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = () => {
    return new Request('http://localhost/api/knowledge/123/chunks');
  };

  it('should return 404 if source is not found or does not belong to commerce', async () => {
    const { prisma } = await import('../../../../../../../../src/db/prisma');
    (prisma.knowledgeSource.findFirst as any).mockResolvedValue(null);

    const req = createMockRequest();
    // Simulate Next.js app router params
    const res = await GET(req, { params: Promise.resolve({ id: 'src-123' }) });
    
    expect(res.status).toBe(404);
  });

  it('should return chunks if authorized', async () => {
    const { prisma } = await import('../../../../../../../../src/db/prisma');
    (prisma.knowledgeSource.findFirst as any).mockResolvedValue({ id: 'src-123', commerceId: 'comm-123' });
    (prisma.documentChunk.findMany as any).mockResolvedValue([
      { id: 'chunk-1', content: 'hello world' }
    ]);

    const req = createMockRequest();
    const res = await GET(req, { params: Promise.resolve({ id: 'src-123' }) });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.chunks.length).toBe(1);
    expect(data.chunks[0].content).toBe('hello world');
  });
});
