import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { validateMetaSignature, verifyWebhook } from '../webhooks/meta';

/**
 * B-09: firma del webhook de Meta fail-closed, sobre rawBody exacto,
 * con comparación en tiempo constante.
 */

function makeRequest(body: object, signature?: string, withRawBody = true): any {
  const rawBody = Buffer.from(JSON.stringify(body));
  const req: any = {
    headers: {},
    body,
  };
  if (withRawBody) req.rawBody = rawBody;
  if (signature !== undefined) req.headers['x-hub-signature-256'] = signature;
  return req;
}

function signRaw(raw: Buffer, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

const SECRET = 'test-app-secret';
const BODY = { object: 'whatsapp_business_account', entry: [] };

beforeEach(() => {
  vi.stubEnv('META_APP_SECRET', SECRET);
});

describe('validateMetaSignature', () => {
  it('acepta una firma válida sobre el rawBody exacto', () => {
    const req = makeRequest(BODY, signRaw(Buffer.from(JSON.stringify(BODY)), SECRET));
    expect(validateMetaSignature(req)).toBe(true);
  });

  it('rechaza si META_APP_SECRET no está configurado (fail-closed)', () => {
    vi.stubEnv('META_APP_SECRET', '');
    const req = makeRequest(BODY, signRaw(Buffer.from(JSON.stringify(BODY)), SECRET));
    expect(validateMetaSignature(req)).toBe(false);
  });

  it('rechaza si falta la cabecera de firma', () => {
    const req = makeRequest(BODY, undefined);
    expect(validateMetaSignature(req)).toBe(false);
  });

  it('rechaza una firma inválida (body manipulado)', () => {
    const tamperedBody = { ...BODY, hacked: true };
    const req = makeRequest(tamperedBody, signRaw(Buffer.from(JSON.stringify(BODY)), SECRET));
    expect(validateMetaSignature(req)).toBe(false);
  });

  it('rechaza si no hay rawBody capturado (no se puede verificar de forma fiable)', () => {
    const req = makeRequest(BODY, signRaw(Buffer.from(JSON.stringify(BODY)), SECRET), false);
    expect(validateMetaSignature(req)).toBe(false);
  });
});

describe('verifyWebhook — fail-closed sin META_VERIFY_TOKEN', () => {
  it('devuelve 500 si META_VERIFY_TOKEN no está configurado (no acepta test_token)', () => {
    vi.stubEnv('META_VERIFY_TOKEN', '');
    const res = { sendStatus: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    verifyWebhook(
      { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'cualquier_cosa', 'hub.challenge': 'x' } } as any,
      res as any
    );
    expect(res.sendStatus).toHaveBeenCalledWith(500);
  });

  it('verifica el challenge con el token correcto', () => {
    vi.stubEnv('META_VERIFY_TOKEN', 'mi-token-secreto');
    const res = { sendStatus: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    verifyWebhook(
      { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'mi-token-secreto', 'hub.challenge': 'CHALLENGE' } } as any,
      res as any
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('CHALLENGE');
  });

  it('rechaza un token incorrecto con 403', () => {
    vi.stubEnv('META_VERIFY_TOKEN', 'mi-token-secreto');
    const res = { sendStatus: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    verifyWebhook(
      { query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'incorrecto', 'hub.challenge': 'CHALLENGE' } } as any,
      res as any
    );
    expect(res.sendStatus).toHaveBeenCalledWith(403);
  });
});
