"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = require("./db/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const index_1 = require("./rag/index");
const textsplitters_1 = require("@langchain/textsplitters");
// @ts-ignore
const llamaindex_1 = require("llamaindex");
dotenv_1.default.config();
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
console.log('[DocumentWorker] Iniciando worker de procesamiento asíncrono de documentos...');
const worker = new bullmq_1.Worker('document-processing', async (job) => {
    const { commerceId, filename, fileBuffer, category } = job.data;
    console.log(`[DocumentWorker] Procesando documento ${filename} para comercio ${commerceId}`);
    // Create temp file
    const tempDir = os_1.default.tmpdir();
    const tempFilePath = path_1.default.join(tempDir, `${Date.now()}_${filename}`);
    fs_1.default.writeFileSync(tempFilePath, Buffer.from(fileBuffer, 'base64'));
    let fullText = '';
    try {
        const extension = filename.split('.').pop()?.toLowerCase();
        // Si es PDF y tenemos API Key de LlamaCloud, usamos LlamaParse
        if (extension === 'pdf' && process.env.LLAMA_CLOUD_API_KEY) {
            console.log(`[DocumentWorker] Usando LlamaParse para extraer ${filename}`);
            const reader = new llamaindex_1.LlamaParseReader({ resultType: 'markdown' });
            const documents = await reader.loadData(tempFilePath);
            fullText = documents.map((doc) => doc.text).join('\n\n');
        }
        else {
            // Fallback a los parsers antiguos
            const { extractTextFromFile } = require('./rag/parsers');
            fullText = await extractTextFromFile(Buffer.from(fileBuffer, 'base64'), filename);
        }
        if (!fullText || fullText.trim().length === 0) {
            throw new Error('No se pudo extraer texto del documento.');
        }
        // Asegurarnos de que el comercio existe en la DB
        await prisma_1.prisma.commerce.upsert({
            where: { id: commerceId },
            update: {},
            create: {
                id: commerceId,
                name: 'Comercio ' + commerceId,
                systemPrompt: 'Eres un IA asistente.',
            }
        });
        const source = await prisma_1.prisma.knowledgeSource.create({
            data: {
                commerceId,
                name: filename,
                type: 'FILE',
                category: category || 'GENERAL',
                content: fullText,
            }
        });
        const splitter = new textsplitters_1.RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
        const rawChunks = await splitter.splitText(fullText);
        for (const textChunk of rawChunks) {
            if (textChunk.trim().length < 15)
                continue;
            const embedding = await (0, index_1.createEmbedding)(textChunk);
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
        }
        await (0, index_1.purgeSemanticCache)(commerceId);
        console.log(`[DocumentWorker] Documento ${filename} indexado con éxito.`);
    }
    catch (error) {
        console.error(`[DocumentWorker] Error procesando ${filename}:`, error);
        throw error;
    }
    finally {
        if (fs_1.default.existsSync(tempFilePath)) {
            fs_1.default.unlinkSync(tempFilePath);
        }
    }
}, { connection: connection });
worker.on('failed', (job, err) => {
    console.error(`[DocumentWorker] Job ${job?.id} falló:`, err);
});
//# sourceMappingURL=document-worker.js.map