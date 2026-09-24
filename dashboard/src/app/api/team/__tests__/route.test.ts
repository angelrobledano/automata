import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

/**
 * B-07: un OWNER solo puede crear usuarios con roles de negocio (AGENT, OWNER).
 * Crear SUPERADMIN/SUPPORT desde la API de equipo es una escalada de privilegios.
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../src/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed-password') },
}));

import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../../src/db/prisma';

const req = (cookieToken: string | null, body: object) =>
  new Request('http://localhost/api/team', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookieToken ? { cookie: `token=${cookieToken}` } : {}) } as any,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/team — escalada de privilegios', () => {
  it('un OWNER NO puede crear un SUPERADMIN', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-1', role: 'OWNER' });

    const res = await POST(req('valid_token', { email: 'x@y.com', role: 'SUPERADMIN', password: '12345678' }));
    expect(res.status).toBe(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('un OWNER NO puede crear un SUPPORT', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-1', role: 'OWNER' });

    const res = await POST(req('valid_token', { email: 'x@y.com', role: 'SUPPORT', password: '12345678' }));
    expect(res.status).toBe(403);
  });

  it('un OWNER SÍ puede crear un AGENT', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-1', role: 'OWNER' });
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 'u2', email: 'empleado@tienda.com', role: 'AGENT' });

    const res = await POST(req('valid_token', { email: 'empleado@tienda.com', role: 'AGENT', password: '12345678' }));
    expect(res.status).toBe(200);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'AGENT', commerceId: 'commerce-1' }) })
    );
  });

  it('un AGENT no puede invitar equipo', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-1', role: 'AGENT' });

    const res = await POST(req('valid_token', { email: 'x@y.com', role: 'AGENT', password: '12345678' }));
    expect(res.status).toBe(403);
  });
});
