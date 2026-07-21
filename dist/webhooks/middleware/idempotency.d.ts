/**
 * Comprueba si un ID de mensaje ya ha sido procesado usando Redis SETNX.
 * Devuelve true si el mensaje es nuevo y acaba de ser bloqueado (debe procesarse).
 * Devuelve false si el mensaje ya existía (es duplicado).
 */
export declare function checkIdempotency(messageId: string): Promise<boolean>;
//# sourceMappingURL=idempotency.d.ts.map