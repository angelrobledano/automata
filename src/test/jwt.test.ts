import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyDashboardJwt } from '../utils/jwt';

/**
 * Verificación del JWT del dashboard firmado con jose (HS256).
 * El dashboard firma con dashboard/src/lib/jwt.ts (jose); el backend verifica
 * con node crypto — deben ser compatibles.
 */

const SECRET = 'test-secret-for-jwt-verification';

function signHS256(payload: object, secret: string = SECRET): string {
  const b64u = (input: Buffer | string) => Buffer.from(input).toString('base64url');
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('verifyDashboardJwt', () => {
  it('verifica un token HS256 válido y devuelve el payload', async () => {
    const token = signHS256({
      userId: 'user-1',
      commerceId: 'commerce-1',
      role: 'OWNER',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const payload = await verifyDashboardJwt(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.commerceId).toBe('commerce-1');
    expect(payload?.role).toBe('OWNER');
  });

  it('rechaza un token con firma manipulada', async () => {
    const token = signHS256({
      userId: 'user-1',
      commerceId: 'commerce-1',
      role: 'SUPERADMIN',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const [h, b] = token.split('.');
    const tampered = `${h}.${b}.${crypto.randomBytes(32).toString('base64url')}`;

    expect(await verifyDashboardJwt(tampered, SECRET)).toBeNull();
  });

  it('rechaza un token expirado', async () => {
    const token = signHS256({
      userId: 'user-1',
      commerceId: 'commerce-1',
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    expect(await verifyDashboardJwt(token, SECRET)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const token = signHS256(
      { userId: 'user-1', commerceId: 'commerce-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      'otro-secreto'
    );

    expect(await verifyDashboardJwt(token, SECRET)).toBeNull();
  });

  it('rechaza basura que no es un JWT', async () => {
    expect(await verifyDashboardJwt('no-es-un-jwt', SECRET)).toBeNull();
    expect(await verifyDashboardJwt('', SECRET)).toBeNull();
  });
});
