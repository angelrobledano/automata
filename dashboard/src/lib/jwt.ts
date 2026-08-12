import { SignJWT, jwtVerify } from 'jose';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret === 'super-secret-key-for-development')) {
    console.warn('[SECURITY WARNING] JWT_SECRET missing or default in production environment!');
  }
  return secret || 'super-secret-key-for-development';
}

const key = new TextEncoder().encode(getJwtSecret());

export async function signToken(payload: any, expirationTime: string = '24h') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(key);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}
