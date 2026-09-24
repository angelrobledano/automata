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

// B-22/B-17: colas de mantenimiento diario (catálogo + tokens Meta)
export const catalogSyncQueue = new Queue('maintenance-catalog-sync', { connection: connection as any });
export const metaTokenRefreshQueue = new Queue('maintenance-meta-token-refresh', { connection: connection as any });

export async function scheduleDailyJobs(): Promise<void> {
  await catalogSyncQueue.add(
    'sync-all',
    {},
    { repeat: { pattern: '0 4 * * *' }, removeOnComplete: { age: 7 * 24 * 3600 }, removeOnFail: { age: 7 * 24 * 3600 } }
  );
  await metaTokenRefreshQueue.add(
    'refresh-tokens',
    {},
    { repeat: { pattern: '0 5 * * *' }, removeOnComplete: { age: 7 * 24 * 3600 }, removeOnFail: { age: 7 * 24 * 3600 } }
  );
  console.log('[Queue] Trabajos diarios programados: catalog-sync (04:00), meta-token-refresh (05:00)');
}

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
