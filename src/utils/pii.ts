/**
 * Utility to scrub PII (Personally Identifiable Information) and sensitive data 
 * such as emails, credit cards, and cleartext passwords before passing them to LLMs or caching.
 */
export function sanitizePII(text: string): string {
  if (!text) return text;

  let sanitized = text;

  // 1. Scrub Credit Cards (basic 13 to 16 digit numeric sequences, separated by spaces/dashes)
  const creditCardRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  sanitized = sanitized.replace(creditCardRegex, '[TARJETA_FILTRADA]');

  // 2. Scrub Emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  sanitized = sanitized.replace(emailRegex, '[EMAIL_FILTRADO]');

  // 3. Scrub basic credential patterns (e.g., password: mySecret, clave=123456)
  const credentialRegex = /(?:password|contraseña|clave|secret|token|pass)\s*[:=]\s*([^\s,;]+)/gi;
  sanitized = sanitized.replace(credentialRegex, (match, group1) => {
    // Keep the key part, but censor the actual password value
    const keyPart = match.substring(0, match.indexOf(group1));
    return `${keyPart}[SECRET_FILTRADO]`;
  });

  return sanitized;
}
