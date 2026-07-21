"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRateLimited = isRateLimited;
const queue_1 = require("../queue");
async function isRateLimited(identifier, limit, windowSeconds) {
    const key = `rate_limit:${identifier}`;
    const current = await queue_1.connection.incr(key);
    if (current === 1) {
        await queue_1.connection.expire(key, windowSeconds);
    }
    return current > limit;
}
//# sourceMappingURL=rateLimit.js.map