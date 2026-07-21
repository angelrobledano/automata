"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueDocument = exports.documentQueue = exports.enqueueMetaMessage = exports.metaMessageQueue = exports.connection = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
// @ts-ignore
exports.metaMessageQueue = new bullmq_1.Queue('meta-messages', {
    connection: exports.connection,
});
const enqueueMetaMessage = async (payload) => {
    await exports.metaMessageQueue.add('process-message', payload, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    });
};
exports.enqueueMetaMessage = enqueueMetaMessage;
exports.documentQueue = new bullmq_1.Queue('document-processing', { connection: exports.connection });
const enqueueDocument = async (payload) => {
    await exports.documentQueue.add('process-document', payload, {
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    });
};
exports.enqueueDocument = enqueueDocument;
//# sourceMappingURL=queue.js.map