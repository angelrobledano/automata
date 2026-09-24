/**
 * Centralized environment configuration and validation for Automata backend & worker
 */

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  OPENAI_API_KEY?: string | undefined;
  LLM_PROVIDER: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  META_APP_ID?: string | undefined;
  META_APP_SECRET?: string | undefined;
  META_WEBHOOK_VERIFY_TOKEN?: string | undefined;
  WHATSAPP_TOKEN?: string | undefined;
}

const DEFAULT_DEV_JWT = 'super-secret-key-for-development';
const DEFAULT_DEV_KEY = '0123456789abcdef0123456789abcdef';

function validateEnv(): AppEnv {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const isProd = nodeEnv === 'production';

  const jwtSecret = process.env.JWT_SECRET || DEFAULT_DEV_JWT;
  const encryptionKey = process.env.ENCRYPTION_KEY || DEFAULT_DEV_KEY;

  if (isProd) {
    const missing: string[] = [];

    if (!process.env.DATABASE_URL) {
      missing.push('DATABASE_URL');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_DEV_JWT) {
      missing.push('JWT_SECRET (debe ser una cadena secreta segura y no el valor por defecto)');
    }

    if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY === DEFAULT_DEV_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
      missing.push('ENCRYPTION_KEY (debe ser una clave AES-256 de exactamente 32 caracteres y no el valor por defecto)');
    }

    if (missing.length > 0) {
      const errorMsg = `[FATAL] Configuración de producción inválida:\n- ${missing.join('\n- ')}`;
      console.error(errorMsg);
      // Solo lanzamos en runtime real de servidor, no durante 'npm run build' si NEXT_PHASE está activo
      if (!process.env.NEXT_PHASE) {
        throw new Error(errorMsg);
      }
    }
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '3001', 10),
    DATABASE_URL: process.env.DATABASE_URL || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    LLM_PROVIDER: process.env.LLM_PROVIDER || 'openai',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_SECRET: jwtSecret,
    ENCRYPTION_KEY: encryptionKey,
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN,
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  };
}

export const env = validateEnv();
