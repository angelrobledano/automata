import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '../route';

/**
 * B-06: /api/orders nunca debe resolver el commerceId por fallback (findFirst).
 * Sin sesión → 401. Con sesión → solo pedidos del commerce del JWT.
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: { findFirst: vi.fn() },
    order: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    channelConnection: { findFirst: vi.fn() },
  },
}));

import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../../src/db/prisma';

const createMockRequest = (cookieToken: string | null, searchParams = '', body?: object) => {
  const req = new Request(`http://localhost/api/orders${searchParams}`, {
    method: body ? 'PATCH' : 'GET',
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
  if (cookieToken) req.headers.set('cookie', `token=${cookieToken}`);
  return req;
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.commerce.findFirst as any).mockResolvedValue({ id: 'primer-commerce-de-la-bd' });
});

describe('GET /api/orders — aislamiento multi-tenant', () => {
  it('devuelve 401 sin sesión (no resuelve el primer comercio de la BD)', async () => {
    (verifyToken as any).mockResolvedValue(null);
    const res = await GET(createMockRequest(null));
    expect(res.status).toBe(401);
    expect(prisma.commerce.findFirst).not.toHaveBeenCalled();
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('con sesión válida consulta solo el commerce del JWT', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.order.findMany as any).mockResolvedValue([]);

    const res = await GET(createMockRequest('valid_token'));
    expect(res.status).toBe(200);
    expect((prisma.order.findMany as any).mock.calls[0][0].where.commerceId).toBe('commerce-123');
    expect(prisma.commerce.findFirst).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/orders — aislamiento multi-tenant', () => {
  it('devuelve 401 sin sesión', async () => {
    (verifyToken as any).mockResolvedValue(null);
    const res = await PATCH(createMockRequest(null, '', { id: 'order-1', status: 'READY' }));
    expect(res.status).toBe(401);
  });

  it('no permite actualizar un pedido de otro comercio', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.order.findFirst as any).mockResolvedValue(null); // el pedido no es de este commerce

    const res = await PATCH(createMockRequest('valid_token', '', { id: 'order-de-otro', status: 'READY' }));
    expect(res.status).toBe(404);
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
