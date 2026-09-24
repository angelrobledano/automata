import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// @ts-ignore
export const metaMessageQueue = new Queue('meta-messages', {
  connection: connection as any,
});

export const enqueueMetaMessage = async (payload: any) => {
  await metaMessageQueue.add('process-message', payload, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    // Evitar acumulación ilimitada de jobs en Redis
    removeOnComplete: { age: 3600, count: 5000 }, // 1h (o >5000 completados)
    removeOnFail: { age: 7 * 24 * 3600 }, // 7 días para diagnóstico
  });
};

export const documentQueue = new Queue('document-processing', { connection: connection as any });

export const enqueueDocument = async (payload: { commerceId: string, filename: string, fileBuffer: string, category: string }) => {
  await documentQueue.add('process-document', payload, {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 3600, count: 5000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  });
};
