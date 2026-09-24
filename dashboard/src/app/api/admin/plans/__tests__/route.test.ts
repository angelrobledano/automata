import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { PUT, DELETE } from '../[id]/route';

/**
 * B-07: el CRUD de planes es God-Mode de plataforma — solo SUPERADMIN/SUPPORT.
 * Antes era público (crear/modificar/borrar precios de toda la plataforma sin sesión).
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    plan: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    planFeature: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../../../src/db/prisma';

const req = (method: string, cookieToken: string | null, body?: object, path = '') =>
  new Request(`http://localhost/api/admin/plans${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
    ...(cookieToken ? { headers: { cookie: `token=${cookieToken}` } as any } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/admin/plans', () => {
  it('devuelve 401 sin sesión', async () => {
    (verifyToken as any).mockResolvedValue(null);
    const res = await GET(req('GET', null));
    expect(res.status).toBe(401);
  });

  it('devuelve 403 para un OWNER (no es staff de plataforma)', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'c1', role: 'OWNER' });
    const res = await GET(req('GET', 'valid_token'));
    expect(res.status).toBe(403);
  });

  it('permite lectura a SUPERADMIN', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'c1', role: 'SUPERADMIN' });
    (prisma.plan.findMany as any).mockResolvedValue([]);
    const res = await GET(req('GET', 'valid_token'));
    expect(res.status).toBe(200);
  });
});

describe('POST /api/admin/plans', () => {
  it('devuelve 403 para un OWNER', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'c1', role: 'OWNER' });
    const res = await POST(req('POST', 'valid_token', { name: 'Plan', monthlyPrice: '49' }));
    expect(res.status).toBe(403);
    expect(prisma.plan.create).not.toHaveBeenCalled();
  });

  it('permite crear a SUPERADMIN', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'c1', role: 'SUPERADMIN' });
    (prisma.plan.create as any).mockResolvedValue({ id: 'p1', name: 'Plan' });
    const res = await POST(req('POST', 'valid_token', { name: 'Plan', monthlyPrice: '49' }));
    expect(res.status).toBe(201);
  });
});

describe('PUT/DELETE /api/admin/plans/[id]', () => {
  it('devuelve 403 para un OWNER', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'c1', role: 'OWNER' });
    const resPut = await PUT(req('PUT', 'valid_token', { name: 'X' }, '/plan-1'), { params: Promise.resolve({ id: 'plan-1' }) });
    const resDel = await DELETE(req('DELETE', 'valid_token', undefined, '/plan-1'), { params: Promise.resolve({ id: 'plan-1' }) });
    expect(resPut.status).toBe(403);
    expect(resDel.status).toBe(403);
    expect(prisma.plan.update).not.toHaveBeenCalled();
    expect(prisma.plan.delete).not.toHaveBeenCalled();
  });
});
