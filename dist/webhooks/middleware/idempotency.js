"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIdempotency = checkIdempotency;
const queue_1 = require("../../queue"); // Usar la misma conexión de redis que bullmq
/**
 * Comprueba si un ID de mensaje ya ha sido procesado usando Redis SETNX.
 * Devuelve true si el mensaje es nuevo y acaba de ser bloqueado (debe procesarse).
 * Devuelve false si el mensaje ya existía (es duplicado).
 */
async function checkIdempotency(messageId) {
    if (!messageId)
        return true; // Si no hay ID, no podemos garantizar idempotencia, procesamos
    const key = `idempotency:meta_webhook:${messageId}`;
    // Intentamos guardar la clave con una caducidad de 24 horas (86400 segundos)
    // SETNX devuelve 1 si la clave se configuró, 0 si ya existía.
    const isNew = await queue_1.connection.setnx(key, '1');
    if (isNew) {
        await queue_1.connection.expire(key, 86400); // Expirar en 24h
        return true; // Es nuevo
    }
    return false; // Es duplicado
}
//# sourceMappingURL=idempotency.js.map