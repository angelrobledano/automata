import crypto from 'crypto';

/**
 * Verificación de JWT HS256 del dashboard usando node crypto.
 *
 * El dashboard firma con `jose` (HS256); esta utilidad verifica los mismos
 * tokens en el backend (Socket.io, rutas admin) SIN añadir una dependencia:
 * HS256 es HMAC-SHA256 sobre base64url(header).base64url(payload).
 *
 * El payload incluye userId, commerceId, email y role (ver dashboard/src/lib/jwt.ts).
 */

export interface DashboardJwtPayload {
  userId?: string;
  commerceId?: string;
  email?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

function base64UrlToBuffer(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

/**
 * Verifica un JWT HS256. Devuelve el payload o null si es inválido/expirado.
 * Comparación de firma en tiempo constante (timingSafeEqual).
 */
export async function verifyDashboardJwt(
  token: string,
  secret: string = process.env.JWT_SECRET || ''
): Promise<DashboardJwtPayload | null> {
  try {
    if (!token || !secret) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Solo aceptamos HS256
    const header = JSON.parse(Buffer.from(headerB64!, 'base64url').toString('utf8'));
    if (header?.alg !== 'HS256') return null;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();

    const provided = base64UrlToBuffer(signatureB64!);
    if (provided.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(provided, expected)) return null;

    const payload: DashboardJwtPayload = JSON.parse(
      Buffer.from(payloadB64!, 'base64url').toString('utf8')
    );

    // Expiración (claim estándar). jose exige exp al firmar; si no existe, rechazar.
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extrae el JWT de una cookie serializada estilo "token=abc; other=x".
 */
export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
