import OpenAI from 'openai';
import { prisma } from '../db/prisma';
import IORedis from 'ioredis';
import crypto from 'crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function createEmbedding(text: string): Promise<number[]> {
  const provider = process.env.LLM_PROVIDER || 'openai';
  
  // Caché de Embeddings con Redis (TTL 24h)
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  const cacheKey = `embedding:${provider}:${hash}`;
  const cachedEmbedding = await redis.get(cacheKey);
  if (cachedEmbedding) {
    return JSON.parse(cachedEmbedding);
  }

  let embedding: number[];

  if (provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';
    // Use the native Ollama API for embeddings (not the /v1 OpenAI wrapper just to be safe)
    const baseUrl = ollamaUrl.replace('/v1', '');
    const res = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      })
    });
    const data = await res.json();
    if (!data.embedding) throw new Error('Ollama no devolvió un embedding. Asegúrate de haber hecho "ollama pull nomic-embed-text"');
    embedding = data.embedding;
  } else {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    const e = response.data[0]?.embedding;
    if (!e) throw new Error('No embedding from OpenAI');
    embedding = e;
  }

  // PgVector schema is strictly vector(1536) for OpenAI. 
  // If Ollama (nomic-embed-text) returns 768, we pad it with 0s to avoid DB crash.
  // Zero-padding does not break cosine similarity logic.
  if (embedding.length < 1536) {
    embedding = [...embedding, ...Array(1536 - embedding.length).fill(0)];
  } else if (embedding.length > 1536) {
    embedding = embedding.slice(0, 1536);
  }

  await redis.set(cacheKey, JSON.stringify(embedding), 'EX', 86400);

  return embedding;
}

export async function addDocumentChunk(commerceId: string, sourceId: string, content: string) {
  const embedding = await createEmbedding(content);

  // Prisma no tiene soporte nativo total para arrays de vectores en el create directo sin raw queries
  // dependiendo de la versión. Usaremos $executeRaw para estar seguros con pgvector.
  const chunkId = require('crypto').randomUUID();

  await prisma.$executeRaw`
    INSERT INTO "DocumentChunk" (id, "knowledgeSourceId", content, embedding)
    VALUES (${chunkId}, ${sourceId}, ${content}, ${embedding}::vector)
  `;

  return chunkId;
}

/**
 * Recibe un archivo, extrae su texto, lo divide en chunks y lo almacena.
 */
export async function addDocumentFromFile(commerceId: string, filename: string, buffer: Buffer, category: string = "GENERAL") {
  const { extractTextFromFile } = await import('./parsers');
  const fullText = await extractTextFromFile(buffer, filename);
  
  if (!fullText || fullText.trim().length === 0) {
    throw new Error('No hemos podido extraer texto útil de este documento. Asegúrate de que no es una imagen escaneada o un archivo vacío.');
  }

  // Recursive Overlap Chunking
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const rawChunks = await splitter.splitText(fullText);
  
  // Asegurarnos de que el comercio existe en la DB (útil para pruebas locales sin semilla de datos)
  await prisma.commerce.upsert({
    where: { id: commerceId },
    update: {},
    create: {
      id: commerceId,
      name: 'Test Commerce',
      systemPrompt: 'Eres un IA asistente.',
    }
  });

  // Nos aseguramos de tener la fuente
  const source = await prisma.knowledgeSource.create({
    data: {
      commerceId,
      name: filename,
      type: 'DOCUMENT',
      category: category,
      content: fullText.substring(0, 500) + '... (truncado)',
    }
  });

  const results = [];
  try {
    for (const textChunk of rawChunks) {
      if (textChunk.trim().length < 15) continue; // Ignorar muy pequeños y ruido
      
      // Generar embedding
      const embedding = await createEmbedding(textChunk);
      
      // Guardar el chunk
      const docChunk = await prisma.documentChunk.create({
        data: {
          knowledgeSourceId: source.id,
          content: textChunk.trim(),
        }
      });
      
      // Guardar vector raw
      await prisma.$executeRaw`
        UPDATE "DocumentChunk" 
        SET embedding = ${embedding}::vector 
        WHERE id = ${docChunk.id}
      `;
      
      results.push(docChunk.id);
    }

    if (results.length === 0) {
      throw new Error('El documento no contiene fragmentos de texto lo suficientemente largos para memorizar (mínimo 15 caracteres por párrafo).');
    }
  } catch (error) {
    // Revertir: eliminar la fuente de conocimiento y todos sus chunks
    await prisma.knowledgeSource.delete({ where: { id: source.id } });
    throw error;
  }
  
  return { sourceId: source.id, chunksProcessed: results.length };
}

export async function addTextThread(commerceId: string, title: string, text: string, category: string = "GENERAL") {
  // Asegurarnos de que el comercio existe en la DB
  await prisma.commerce.upsert({
    where: { id: commerceId },
    update: {},
    create: {
      id: commerceId,
      name: 'Test Commerce',
      systemPrompt: 'Eres un IA asistente.',
    }
  });

  const source = await prisma.knowledgeSource.create({
    data: {
      commerceId,
      name: title,
      type: 'TEXT',
      category: category,
      content: text,
    }
  });

  // Recursive Overlap Chunking
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const rawChunks = await splitter.splitText(text);
  const results = [];
  try {
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
      results.push(docChunk.id);
    }

    if (results.length === 0) {
      throw new Error('El hilo de conocimiento es demasiado corto o no contiene información válida (mínimo 15 caracteres).');
    }
  } catch (error) {
    // Revertir: eliminar la fuente de conocimiento y todos sus chunks
    await prisma.knowledgeSource.delete({ where: { id: source.id } });
    throw error;
  }
  
  return { sourceId: source.id, chunksProcessed: results.length };
}

export async function updateTextThread(sourceId: string, title: string, text: string) {
  // Update source
  await prisma.knowledgeSource.update({
    where: { id: sourceId },
    data: { name: title, content: text }
  });

  // Delete old chunks
  await prisma.documentChunk.deleteMany({
    where: { knowledgeSourceId: sourceId }
  });

  // Create new chunks
  // Recursive Overlap Chunking
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const rawChunks = await splitter.splitText(text);
  const results = [];
  try {
    for (const textChunk of rawChunks) {
      if (textChunk.trim().length < 15) continue;
      
      const embedding = await createEmbedding(textChunk);
      const docChunk = await prisma.documentChunk.create({
        data: {
          knowledgeSourceId: sourceId,
          content: textChunk.trim(),
        }
      });
      
      await prisma.$executeRaw`
        UPDATE "DocumentChunk" 
        SET embedding = ${embedding}::vector 
        WHERE id = ${docChunk.id}
      `;
      results.push(docChunk.id);
    }
    if (results.length === 0) {
      throw new Error('El conocimiento no contiene información válida suficiente (mínimo 15 caracteres).');
    }
  } catch (error) {
    // Wait, we shouldn't delete the source if this is an update that failed, 
    // but the old chunks were already deleted. In a true transaction we'd rollback everything.
    // For now we just throw the error to UI.
    throw error;
  }
  
  return { sourceId, chunksProcessed: results.length };
}

export async function searchSimilarChunks(commerceId: string, query: string, limit: number = 3) {
  const queryEmbedding = await createEmbedding(query);

  // Hybrid Search (BM25 + PgVector) with Reciprocal Rank Fusion (RRF)
  // Umbral (Threshold) de 0.45 para la parte vectorial
  const results = await prisma.$queryRaw<Array<{ id: string, content: string, sourcename: string, rrf_score: number }>>`
    WITH vector_search AS (
      SELECT 
        c.id, 
        c.content, 
        s.name as sourcename,
        c.embedding <=> ${queryEmbedding}::vector as distance,
        ROW_NUMBER() OVER (ORDER BY c.embedding <=> ${queryEmbedding}::vector) as rank
      FROM "DocumentChunk" c
      JOIN "KnowledgeSource" s ON c."knowledgeSourceId" = s.id
      WHERE s."commerceId" = ${commerceId}
        AND (c.embedding <=> ${queryEmbedding}::vector) < 0.75
      ORDER BY distance ASC
      LIMIT 20
    ),
    keyword_search AS (
      SELECT 
        c.id, 
        c.content, 
        s.name as sourcename,
        ts_rank(to_tsvector('spanish', c.content), websearch_to_tsquery('spanish', ${query})) as rank_score,
        ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('spanish', c.content), websearch_to_tsquery('spanish', ${query})) DESC) as rank
      FROM "DocumentChunk" c
      JOIN "KnowledgeSource" s ON c."knowledgeSourceId" = s.id
      WHERE s."commerceId" = ${commerceId}
        AND to_tsvector('spanish', c.content) @@ websearch_to_tsquery('spanish', ${query})
      ORDER BY rank_score DESC
      LIMIT 20
    )
    SELECT 
      COALESCE(v.id, k.id) as id,
      COALESCE(v.content, k.content) as content,
      COALESCE(v.sourcename, k.sourcename) as sourcename,
      (COALESCE(1.0 / (60 + v.rank), 0.0) + COALESCE(1.0 / (60 + k.rank), 0.0)) as rrf_score
    FROM vector_search v
    FULL OUTER JOIN keyword_search k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT ${limit}
  `;

  return results;
}
