/**
 * Centralized environment configuration and security validator for Next.js Dashboard
 */

const DEFAULT_DEV_JWT = 'super-secret-key-for-development';
const DEFAULT_DEV_KEY = '0123456789abcdef0123456789abcdef';

export const isProduction = process.env.NODE_ENV === 'production';

export function getServerEnv() {
  const jwtSecret = process.env.JWT_SECRET || DEFAULT_DEV_JWT;
  const encryptionKey = process.env.ENCRYPTION_KEY || DEFAULT_DEV_KEY;

  // En producción real (runtime de servidor, ignorando la fase de build estático),
  // asegurar que no se ejecuten secretos inseguros
  if (isProduction && typeof window === 'undefined' && !process.env.NEXT_PHASE) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_JWT) {
      console.warn('[SECURITY WARNING] JWT_SECRET es inseguro o usa el valor por defecto en producción.');
    }
    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === DEFAULT_DEV_KEY) {
      console.warn('[SECURITY WARNING] ENCRYPTION_KEY es inseguro o usa el valor por defecto en producción.');
    }
  }

  return {
    isProduction,
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret,
    encryptionKey,
    openaiApiKey: process.env.OPENAI_API_KEY,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };
}
