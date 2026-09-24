import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, PUT } from '../route';

/**
 * B-06: /api/knowledge/text escribe en la base de conocimiento del comercio.
 * El commerceId SIEMPRE viene del JWT (nunca del body) y el PUT verifica
 * propiedad del sourceId antes de actualizar.
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../../src/rag/index', () => ({
  addTextThread: vi.fn(),
  updateTextThread: vi.fn(),
}));

vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    knowledgeSource: { findFirst: vi.fn() },
  },
}));

import { verifyToken } from '@/lib/jwt';
import { addTextThread, updateTextThread } from '../../../../../../../src/rag/index';
import { prisma } from '../../../../../../../src/db/prisma';

const req = (method: 'POST' | 'PUT', cookieToken: string | null, body: object) =>
  new Request('http://localhost/api/knowledge/text', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
    ...(cookieToken ? { headers: { cookie: `token=${cookieToken}` } as any } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/knowledge/text', () => {
  it('devuelve 401 sin sesión', async () => {
    (verifyToken as any).mockResolvedValue(null);
    const res = await POST(req('POST', null, { title: 'T', text: 'C' }));
    expect(res.status).toBe(401);
    expect(addTextThread).not.toHaveBeenCalled();
  });

  it('usa el commerceId del JWT e IGNORA el commerceId del body (no envenenamiento cross-tenant)', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (addTextThread as any).mockResolvedValue({ sourceId: 'src-1', chunksProcessed: 2 });

    const res = await POST(req('POST', 'valid_token', {
      title: 'Horario',
      text: 'Abrimos de 9 a 5',
      commerceId: 'commerce-999', // intento de escritura en otro comercio
    }));

    expect(res.status).toBe(200);
    expect((addTextThread as any).mock.calls[0][0]).toBe('commerce-123');
  });
});

describe('PUT /api/knowledge/text', () => {
  it('devuelve 401 sin sesión', async () => {
    const res = await PUT(req('PUT', null, { sourceId: 'src-1', title: 'T', text: 'C' }));
    expect(res.status).toBe(401);
    expect(updateTextThread).not.toHaveBeenCalled();
  });

  it('rechaza actualizar un sourceId que no pertenece al comercio del JWT', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.knowledgeSource.findFirst as any).mockResolvedValue(null);

    const res = await PUT(req('PUT', 'valid_token', { sourceId: 'src-de-otro', title: 'T', text: 'C' }));
    expect(res.status).toBe(404);
    expect(updateTextThread).not.toHaveBeenCalled();
  });

  it('actualiza cuando el sourceId pertenece al comercio del JWT', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.knowledgeSource.findFirst as any).mockResolvedValue({ id: 'src-1', commerceId: 'commerce-123' });
    (updateTextThread as any).mockResolvedValue({ sourceId: 'src-1', chunksProcessed: 3 });

    const res = await PUT(req('PUT', 'valid_token', { sourceId: 'src-1', title: 'T', text: 'C' }));
    expect(res.status).toBe(200);
    expect(updateTextThread).toHaveBeenCalledWith('src-1', 'T', 'C', undefined);
  });
});
