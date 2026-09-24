import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as Sentry from '@sentry/node';
import { processMetaJob } from './worker-processor';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'meta-messages',
  (job) => processMetaJob(job, connection),
  {
    // @ts-ignore
    connection,
    concurrency: 50 // SRE: Evitar cuello de botella bajo carga masiva
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job completado: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Error en el job ${job?.id}:`, err);
});

// Graceful shutdown: terminar el job en curso y cerrar conexiones antes de salir
let isShuttingDown = false;
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Worker] ${signal} recibido. Cerrando worker de forma ordenada...`);
  try {
    await worker.close(); // espera a que terminen los jobs en curso
    await connection.quit();
  } catch (err) {
    console.error('[Worker] Error durante el shutdown:', err);
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

console.log('[Worker] Iniciado y escuchando colas...');
