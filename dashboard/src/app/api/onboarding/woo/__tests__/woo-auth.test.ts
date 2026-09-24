import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../callback/route';
import { POST } from '../auth/route';

/**
 * B-08: el callback de la autorización 1-clic de Woo exige sesión y ownership.
 * Antes: POST público — cualquiera que conociera un commerceId podía
 * sobrescribir sus credenciales Woo cifradas.
 */

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../../../../../../../src/utils/crypto', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

vi.mock('../../../../../../../src/catalog/sync-service', () => ({
  CatalogSyncService: { syncCommerceCatalog: vi.fn(() => Promise.resolve()) },
}));

import { verifyToken } from '@/lib/jwt';
import { prisma } from '../../../../../../../src/db/prisma';
import { CatalogSyncService } from '../../../../../../../src/catalog/sync-service';

const callbackReq = (cookieToken: string | null, params: Record<string, string>) => {
  const search = new URLSearchParams(params).toString();
  const req = new Request(`http://localhost/api/onboarding/woo/callback?${search}`);
  if (cookieToken) req.headers.set('cookie', `token=${cookieToken}`);
  return req;
};

const authReq = (cookieToken: string | null, body: object) =>
  new Request('http://localhost/api/onboarding/woo/auth', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookieToken ? { cookie: `token=${cookieToken}` } : {}) } as any,
  });

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.commerce.update as any).mockResolvedValue({ id: 'commerce-123' });
});

describe('GET /api/onboarding/woo/callback — autorización 1-clic', () => {
  const validParams = { user_id: 'commerce-123', consumer_key: 'ck_abc', consumer_secret: 'cs_xyz' };

  it('rechaza sin sesión (no se pueden sobrescribir credenciales de un comercio ajeno)', async () => {
    (verifyToken as any).mockResolvedValue(null);

    const res = await GET(callbackReq(null, validParams));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('woo_error=no_session');
    expect(prisma.commerce.update).not.toHaveBeenCalled();
  });

  it('rechaza si el user_id no coincide con el commerce del JWT (ownership)', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });

    const res = await GET(callbackReq('valid_token', { ...validParams, user_id: 'commerce-999' }));
    expect(res.headers.get('location')).toContain('woo_error=ownership');
    expect(prisma.commerce.update).not.toHaveBeenCalled();
  });

  it('guarda credenciales cifradas y lanza el sync de catálogo cuando todo es válido', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.commerce.findUnique as any).mockResolvedValue({
      id: 'commerce-123',
      providerMetadata: { pendingWooUrl: 'https://mitienda.com' },
    });

    const res = await GET(callbackReq('valid_token', validParams));
    expect(res.headers.get('location')).toContain('woo_connected=1');

    const updateCall = (prisma.commerce.update as any).mock.calls[0][0];
    expect(updateCall.where.id).toBe('commerce-123');
    expect(updateCall.data.providerMetadata.wooConsumerKey).toBe('enc:ck_abc');
    expect(updateCall.data.providerMetadata.wooConsumerSecret).toBe('enc:cs_xyz');
    expect(updateCall.data.providerMetadata.wooUrl).toBe('https://mitienda.com');
    expect(CatalogSyncService.syncCommerceCatalog).toHaveBeenCalledWith('commerce-123');
  });
});

describe('POST /api/onboarding/woo/auth — generación de URL de autorización', () => {
  it('rechaza URLs internas/privadas (SSRF-lite)', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });

    for (const badUrl of ['http://localhost:8080', 'http://169.254.169.254', 'http://192.168.1.1', 'http://10.0.0.5']) {
      const res = await POST(authReq('valid_token', { wooUrl: badUrl }));
      expect(res.status).toBe(400);
    }
    expect(prisma.commerce.update).not.toHaveBeenCalled();
  });

  it('acepta una URL pública y guarda la pendiente', async () => {
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });
    (prisma.commerce.findUnique as any).mockResolvedValue({ providerMetadata: null });

    const res = await POST(authReq('valid_token', { wooUrl: 'mitienda.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authUrl).toContain('https://mitienda.com/wc-auth/v1/authorize');
    expect(data.authUrl).toContain('user_id=commerce-123');
  });
});
