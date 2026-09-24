import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

/**
 * B-06: /api/insights/resolve requiere sesión y solo permite resolver
 * insights del propio comercio.
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    insight: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../../../../../../src/rag/index', () => ({
  addTextThread: vi.fn(),
}));

import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../../../src/db/prisma';
import { addTextThread } from '../../../../../../../src/rag/index';

const req = (cookieToken: string | null, body: object) =>
  new Request('http://localhost/api/insights/resolve', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookieToken ? { cookie: `token=${cookieToken}` } : {}) } as any,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/insights/resolve', () => {
  it('devuelve 401 sin sesión', async () => {
    const res = await POST(req(null, { insightId: 'ins-1' }));
    expect(res.status).toBe(401);
    expect(prisma.insight.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza resolver un insight de otro comercio', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    // Prisma real devuelve null: el where filtra por el commerceId del JWT
    // y el insight pertenece a commerce-999
    (prisma.insight.findFirst as any).mockResolvedValue(null);

    const res = await POST(req('valid_token', { insightId: 'ins-1', action: 'CREATE_KNOWLEDGE' }));
    expect(res.status).toBe(404);
    expect(addTextThread).not.toHaveBeenCalled();
    expect(prisma.insight.update).not.toHaveBeenCalled();
  });

  it('resuelve un insight propio creando conocimiento en el comercio correcto', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.insight.findFirst as any).mockResolvedValue({
      id: 'ins-1',
      commerceId: 'commerce-123',
      title: 'Falta información de alérgenos',
      actionData: { title: 'Alérgenos', content: 'Contenido...', category: 'POLICIES' },
    });
    (addTextThread as any).mockResolvedValue({ sourceId: 'src-1', chunksProcessed: 1 });
    (prisma.insight.update as any).mockResolvedValue({ id: 'ins-1', isResolved: true });

    const res = await POST(req('valid_token', { insightId: 'ins-1', action: 'CREATE_KNOWLEDGE' }));
    expect(res.status).toBe(200);
    expect((addTextThread as any).mock.calls[0][0]).toBe('commerce-123');
    expect(prisma.insight.update).toHaveBeenCalledWith({ where: { id: 'ins-1' }, data: { isResolved: true } });
  });
});
