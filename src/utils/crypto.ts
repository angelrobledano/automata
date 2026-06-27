import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Default for dev if missing
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Error encrypting string', error);
    return text; // Fallback or throw error depending on strictness
  }
}

export function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text; // If it's plain text, just return it (graceful migration)
  
  try {
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
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting string', error);
    return text;
  }
}
