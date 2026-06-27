"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmbedding = createEmbedding;
exports.addDocumentChunk = addDocumentChunk;
exports.addDocumentFromFile = addDocumentFromFile;
exports.addTextThread = addTextThread;
exports.updateTextThread = updateTextThread;
exports.searchSimilarChunks = searchSimilarChunks;
const openai_1 = __importDefault(require("openai"));
const prisma_1 = require("../db/prisma");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
const textsplitters_1 = require("@langchain/textsplitters");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
async function createEmbedding(text) {
    const provider = process.env.LLM_PROVIDER || 'openai';
    // Caché de Embeddings con Redis (TTL 24h)
    const hash = crypto_1.default.createHash('sha256').update(text).digest('hex');
    const cacheKey = `embedding:${provider}:${hash}`;
    const cachedEmbedding = await redis.get(cacheKey);
    if (cachedEmbedding) {
        return JSON.parse(cachedEmbedding);
    }
    let embedding;
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
        if (!data.embedding)
            throw new Error('Ollama no devolvió un embedding. Asegúrate de haber hecho "ollama pull nomic-embed-text"');
        embedding = data.embedding;
    }
    else {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        embedding = response.data[0].embedding;
    }
    // PgVector schema is strictly vector(1536) for OpenAI. 
    // If Ollama (nomic-embed-text) returns 768, we pad it with 0s to avoid DB crash.
    // Zero-padding does not break cosine similarity logic.
    if (embedding.length < 1536) {
        embedding = [...embedding, ...Array(1536 - embedding.length).fill(0)];
    }
    else if (embedding.length > 1536) {
        embedding = embedding.slice(0, 1536);
    }
    await redis.set(cacheKey, JSON.stringify(embedding), 'EX', 86400);
    return embedding;
}
async function addDocumentChunk(commerceId, sourceId, content) {
    const embedding = await createEmbedding(content);
    // Prisma no tiene soporte nativo total para arrays de vectores en el create directo sin raw queries
    // dependiendo de la versión. Usaremos $executeRaw para estar seguros con pgvector.
    const chunkId = require('crypto').randomUUID();
    await prisma_1.prisma.$executeRaw `
    INSERT INTO "DocumentChunk" (id, "knowledgeSourceId", content, embedding)
    VALUES (${chunkId}, ${sourceId}, ${content}, ${embedding}::vector)
  `;
    return chunkId;
}
/**
 * Recibe un archivo, extrae su texto, lo divide en chunks y lo almacena.
 */
async function addDocumentFromFile(commerceId, filename, buffer, category = "GENERAL") {
    const { extractTextFromFile } = await Promise.resolve().then(() => __importStar(require('./parsers')));
    const fullText = await extractTextFromFile(buffer, filename);
    if (!fullText || fullText.trim().length === 0) {
        throw new Error('No hemos podido extraer texto útil de este documento. Asegúrate de que no es una imagen escaneada o un archivo vacío.');
    }
    // Recursive Overlap Chunking
    const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const rawChunks = await splitter.splitText(fullText);
    // Asegurarnos de que el comercio existe en la DB (útil para pruebas locales sin semilla de datos)
    await prisma_1.prisma.commerce.upsert({
        where: { id: commerceId },
        update: {},
        create: {
            id: commerceId,
            name: 'Test Commerce',
            wooUrl: 'https://test.com',
            wooConsumerKey: 'test',
            wooConsumerSecret: 'test',
            systemPrompt: 'Eres un IA asistente.',
        }
    });
    // Nos aseguramos de tener la fuente
    const source = await prisma_1.prisma.knowledgeSource.create({
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
            if (textChunk.trim().length < 15)
                continue; // Ignorar muy pequeños y ruido
            // Generar embedding
            const embedding = await createEmbedding(textChunk);
            // Guardar el chunk
            const docChunk = await prisma_1.prisma.documentChunk.create({
                data: {
                    knowledgeSourceId: source.id,
                    content: textChunk.trim(),
                }
            });
            // Guardar vector raw
            await prisma_1.prisma.$executeRaw `
        UPDATE "DocumentChunk" 
        SET embedding = ${embedding}::vector 
        WHERE id = ${docChunk.id}
      `;
            results.push(docChunk.id);
        }
        if (results.length === 0) {
            throw new Error('El documento no contiene fragmentos de texto lo suficientemente largos para memorizar (mínimo 15 caracteres por párrafo).');
        }
    }
    catch (error) {
        // Revertir: eliminar la fuente de conocimiento y todos sus chunks
        await prisma_1.prisma.knowledgeSource.delete({ where: { id: source.id } });
        throw error;
    }
    return { sourceId: source.id, chunksProcessed: results.length };
}
async function addTextThread(commerceId, title, text, category = "GENERAL") {
    // Asegurarnos de que el comercio existe en la DB
    await prisma_1.prisma.commerce.upsert({
        where: { id: commerceId },
        update: {},
        create: {
            id: commerceId,
            name: 'Test Commerce',
            wooUrl: 'https://test.com',
            wooConsumerKey: 'test',
            wooConsumerSecret: 'test',
            systemPrompt: 'Eres un IA asistente.',
        }
    });
    const source = await prisma_1.prisma.knowledgeSource.create({
        data: {
            commerceId,
            name: title,
            type: 'TEXT',
            category: category,
            content: text,
        }
    });
    // Recursive Overlap Chunking
    const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const rawChunks = await splitter.splitText(text);
    const results = [];
    try {
        for (const textChunk of rawChunks) {
            if (textChunk.trim().length < 15)
                continue;
            const embedding = await createEmbedding(textChunk);
            const docChunk = await prisma_1.prisma.documentChunk.create({
                data: {
                    knowledgeSourceId: source.id,
                    content: textChunk.trim(),
                }
            });
            await prisma_1.prisma.$executeRaw `
        UPDATE "DocumentChunk" 
        SET embedding = ${embedding}::vector 
        WHERE id = ${docChunk.id}
      `;
            results.push(docChunk.id);
        }
        if (results.length === 0) {
            throw new Error('El hilo de conocimiento es demasiado corto o no contiene información válida (mínimo 15 caracteres).');
        }
    }
    catch (error) {
        // Revertir: eliminar la fuente de conocimiento y todos sus chunks
        await prisma_1.prisma.knowledgeSource.delete({ where: { id: source.id } });
        throw error;
    }
    return { sourceId: source.id, chunksProcessed: results.length };
}
async function updateTextThread(sourceId, title, text) {
    // Update source
    await prisma_1.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { name: title, content: text }
    });
    // Delete old chunks
    await prisma_1.prisma.documentChunk.deleteMany({
        where: { knowledgeSourceId: sourceId }
    });
    // Create new chunks
    // Recursive Overlap Chunking
    const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
    const rawChunks = await splitter.splitText(text);
    const results = [];
    try {
        for (const textChunk of rawChunks) {
            if (textChunk.trim().length < 15)
                continue;
            const embedding = await createEmbedding(textChunk);
            const docChunk = await prisma_1.prisma.documentChunk.create({
                data: {
                    knowledgeSourceId: sourceId,
                    content: textChunk.trim(),
                }
            });
            await prisma_1.prisma.$executeRaw `
        UPDATE "DocumentChunk" 
        SET embedding = ${embedding}::vector 
        WHERE id = ${docChunk.id}
      `;
            results.push(docChunk.id);
        }
        if (results.length === 0) {
            throw new Error('El conocimiento no contiene información válida suficiente (mínimo 15 caracteres).');
        }
    }
    catch (error) {
        // Wait, we shouldn't delete the source if this is an update that failed, 
        // but the old chunks were already deleted. In a true transaction we'd rollback everything.
        // For now we just throw the error to UI.
        throw error;
    }
    return { sourceId, chunksProcessed: results.length };
}
async function searchSimilarChunks(commerceId, query, limit = 3) {
    const queryEmbedding = await createEmbedding(query);
    // Hybrid Search (BM25 + PgVector) with Reciprocal Rank Fusion (RRF)
    // Umbral (Threshold) de 0.45 para la parte vectorial
    const results = await prisma_1.prisma.$queryRaw `
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
        AND (c.embedding <=> ${queryEmbedding}::vector) < 0.45
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
//# sourceMappingURL=index.js.map