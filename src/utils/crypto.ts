import crypto from 'crypto';

/**
 * B-10: fail-closed. Sin ENCRYPTION_KEY el módulo lanza al importarse:
 * es mejor que arrancar sin poder proteger los tokens OAuth.
 * NOTA: los datos existentes cifrados con la clave por defecto requieren
 * definir esa MISMA clave en .env hasta ejecutar la migración de re-cifrado.
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY no configurada o inválida: debe tener exactamente 32 caracteres. ' +
      'Sin ella los tokens OAuth no pueden cifrarse/descifrarse de forma segura.'
    );
  }
  return key;
}

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  // Sin formato iv:tag:cipher => dato en texto plano de una era anterior.
  // Se devuelve tal cual (migración graceful) pero queda registrado.
  if (!text || !text.includes(':')) {
    console.warn('[Crypto] decrypt: valor sin formato cifrado, devuelto tal cual (revisar dato en claro).');
    return text;
  }

  const parts = text.split(':');
  if (parts.length !== 3) return text;

  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedText = parts[2];

  if (!ivHex || !authTagHex || !encryptedText) return text;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  decipher.setAuthTag(authTag);

  const decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decipher.final('utf8');
  return decrypted;
}
