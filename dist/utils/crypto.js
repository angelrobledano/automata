"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Default for dev if missing
const IV_LENGTH = 16;
function encrypt(text) {
    if (!text)
        return text;
    try {
        const iv = crypto_1.default.randomBytes(IV_LENGTH);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    catch (error) {
        console.error('Error encrypting string', error);
        return text; // Fallback or throw error depending on strictness
    }
}
function decrypt(text) {
    if (!text || !text.includes(':'))
        return text; // If it's plain text, just return it (graceful migration)
    try {
        const parts = text.split(':');
        if (parts.length !== 3)
            return text;
        const ivHex = parts[0];
        const authTagHex = parts[1];
        const encryptedText = parts[2];
        if (!ivHex || !authTagHex || !encryptedText)
            return text;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Error decrypting string', error);
        return text;
    }
}
//# sourceMappingURL=crypto.js.map