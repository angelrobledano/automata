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
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../rag/index");
// Mockeamos la dependencia de OpenAI
vitest_1.vi.mock('openai', () => {
    return {
        default: class OpenAI {
            embeddings = {
                create: vitest_1.vi.fn().mockResolvedValue({
                    data: [{ embedding: [0.1, 0.2, 0.3] }], // Mock de un vector (1536 dimensiones en la vida real)
                }),
            };
        },
    };
});
// Nota: En un test real TDD de base de datos usaríamos una base de datos de test, 
// o un mock de prisma. Aquí nos aseguramos de que el comportamiento lógico del RAG
// lanza las consultas esperadas.
vitest_1.vi.mock('../db/prisma', () => ({
    prisma: {
        $executeRaw: vitest_1.vi.fn().mockResolvedValue(1),
        $queryRaw: vitest_1.vi.fn().mockResolvedValue([
            { id: 'chunk-1', content: 'Vendemos tartas de queso', distance: 0.05 },
        ]),
    },
}));
(0, vitest_1.describe)('RAG Module (Generación Aumentada por Recuperación)', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('debería generar un embedding a partir de un texto', async () => {
        const embedding = await (0, index_1.createEmbedding)('texto de prueba');
        (0, vitest_1.expect)(embedding).toEqual([0.1, 0.2, 0.3]);
    });
    (0, vitest_1.it)('debería añadir un chunk a la base de datos llamando a $executeRaw', async () => {
        const chunkId = await (0, index_1.addDocumentChunk)('commerce-1', 'source-1', 'Este es un FAQ');
        (0, vitest_1.expect)(chunkId).toBeDefined();
        // Verificamos que se ha llamado a prisma.$executeRaw
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../db/prisma')));
        (0, vitest_1.expect)(prisma.$executeRaw).toHaveBeenCalled();
    });
    (0, vitest_1.it)('debería buscar chunks similares usando similitud del coseno', async () => {
        const results = await (0, index_1.searchSimilarChunks)('commerce-1', '¿vendéis tartas?', 3);
        (0, vitest_1.expect)(results).toHaveLength(1);
        (0, vitest_1.expect)(results[0].content).toContain('tartas de queso');
        (0, vitest_1.expect)(results[0].distance).toBeLessThan(0.1);
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../db/prisma')));
        (0, vitest_1.expect)(prisma.$queryRaw).toHaveBeenCalled();
    });
});
//# sourceMappingURL=rag.test.js.map