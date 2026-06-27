import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { prisma } from './db/prisma';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createEmbedding } from './rag/index';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
// @ts-ignore
import { LlamaParseReader } from 'llamaindex';

dotenv.config();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

console.log('[DocumentWorker] Iniciando worker de procesamiento asíncrono de documentos...');

const worker = new Worker('document-processing', async job => {
  const { commerceId, filename, fileBuffer, category } = job.data;
  console.log(`[DocumentWorker] Procesando documento ${filename} para comercio ${commerceId}`);

  // Create temp file
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `${Date.now()}_${filename}`);
  fs.writeFileSync(tempFilePath, Buffer.from(fileBuffer, 'base64'));

  let fullText = '';

  try {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // Si es PDF y tenemos API Key de LlamaCloud, usamos LlamaParse
    if (extension === 'pdf' && process.env.LLAMA_CLOUD_API_KEY) {
      console.log(`[DocumentWorker] Usando LlamaParse para extraer ${filename}`);
      const reader = new LlamaParseReader({ resultType: 'markdown' });
      const documents = await reader.loadData(tempFilePath);
      fullText = documents.map((doc: any) => doc.text).join('\n\n');
    } else {
      // Fallback a los parsers antiguos
      const { extractTextFromFile } = require('./rag/parsers');
      fullText = await extractTextFromFile(Buffer.from(fileBuffer, 'base64'), filename);
    }

    if (!fullText || fullText.trim().length === 0) {
      throw new Error('No se pudo extraer texto del documento.');
    }

    // Asegurarnos de que el comercio existe en la DB
    await prisma.commerce.upsert({
      where: { id: commerceId },
      update: {},
      create: {
        id: commerceId,
        name: 'Comercio ' + commerceId,
        systemPrompt: 'Eres un IA asistente.',
      }
    });

    const source = await prisma.knowledgeSource.create({
      data: {
        commerceId,
        name: filename,
        type: 'FILE',
        category: category || 'GENERAL',
        content: fullText,
      }
    });

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const rawChunks = await splitter.splitText(fullText);
    
    for (const textChunk of rawChunks) {
      if (textChunk.trim().length < 15) continue;
      
      const embedding = await createEmbedding(textChunk);
      const docChunk = await prisma.documentChunk.create({
        data: {
          knowledgeSourceId: source.id,
          content: textChunk.trim(),
        }
      });
      
      await prisma.$executeRaw`
        UPDATE "DocumentChunk" 
        SET embedding = ${embedding}::vector 
        WHERE id = ${docChunk.id}
      `;
    }

    console.log(`[DocumentWorker] Documento ${filename} indexado con éxito.`);
  } catch (error) {
    console.error(`[DocumentWorker] Error procesando ${filename}:`, error);
    throw error;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}, { connection: connection as any });

worker.on('failed', (job, err) => {
  console.error(`[DocumentWorker] Job ${job?.id} falló:`, err);
});
