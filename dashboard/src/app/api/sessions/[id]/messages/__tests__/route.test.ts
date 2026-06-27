import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

vi.mock('../../../../../../../../src/db/prisma', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    }
  }
}));

describe('Messages API POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return new Request('http://localhost/api/sessions/sess-123/messages', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  };

  it('should return 400 if message content is missing', async () => {
    const req = createMockRequest({});
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-123' }) });
    expect(res.status).toBe(400);
  });

  it('should create an internal note successfully (role=internal_note)', async () => {
    const { prisma } = await import('../../../../../../../../src/db/prisma');
    (prisma.message.create as any).mockResolvedValue({
      id: 'msg-1',
      role: 'internal_note',
      content: 'Test internal note',
      type: 'NOTE'
    });

    const req = createMockRequest({ message: 'Test internal note', isInternalNote: true });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-123' }) });
    
    expect(res.status).toBe(200);
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'sess-123',
        role: 'internal_note',
        type: 'NOTE',
        content: 'Test internal note'
      }
    });
  });

  it('should create a standard assistant message by default', async () => {
    const { prisma } = await import('../../../../../../../../src/db/prisma');
    (prisma.message.create as any).mockResolvedValue({
      id: 'msg-2',
      role: 'assistant',
      content: 'Standard response',
      type: 'TEXT'
    });

    const req = createMockRequest({ message: 'Standard response' });
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-123' }) });
    
    expect(res.status).toBe(200);
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'sess-123',
        role: 'assistant',
        type: 'TEXT',
        content: 'Standard response'
      }
    });
  });

  it('should support explicit message types like IMAGE', async () => {
    const { prisma } = await import('../../../../../../../../src/db/prisma');
    (prisma.message.create as any).mockResolvedValue({
      id: 'msg-3',
      role: 'user',
      content: 'https://example.com/image.jpg',
      type: 'IMAGE'
    });

    const req = createMockRequest({ 
      message: 'https://example.com/image.jpg',
      type: 'IMAGE',
      role: 'user'
    });
    
    const res = await POST(req, { params: Promise.resolve({ id: 'sess-123' }) });
    
    expect(res.status).toBe(200);
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'sess-123',
        role: 'user',
        type: 'IMAGE',
        content: 'https://example.com/image.jpg'
      }
    });
  });
});
