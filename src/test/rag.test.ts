import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmbedding, addDocumentChunk, searchSimilarChunks } from '../rag/index';

// Mockeamos la dependencia de OpenAI
vi.mock('openai', () => {
  return {
    default: class OpenAI {
      embeddings = {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }], // Mock de un vector (1536 dimensiones en la vida real)
        }),
      };
    },
  };
});

// Nota: En un test real TDD de base de datos usaríamos una base de datos de test, 
// o un mock de prisma. Aquí nos aseguramos de que el comportamiento lógico del RAG
// lanza las consultas esperadas.
vi.mock('../db/prisma', () => ({
  prisma: {
    $executeRaw: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([
      { id: 'chunk-1', content: 'Vendemos tartas de queso', distance: 0.05 },
    ]),
  },
}));

describe('RAG Module (Generación Aumentada por Recuperación)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería generar un embedding a partir de un texto', async () => {
    const embedding = await createEmbedding('texto de prueba');
    expect(embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it('debería añadir un chunk a la base de datos llamando a $executeRaw', async () => {
    const chunkId = await addDocumentChunk('commerce-1', 'source-1', 'Este es un FAQ');
    expect(chunkId).toBeDefined();
    
    // Verificamos que se ha llamado a prisma.$executeRaw
    const { prisma } = await import('../db/prisma');
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('debería buscar chunks similares usando similitud del coseno', async () => {
    const results = await searchSimilarChunks('commerce-1', '¿vendéis tartas?', 3);
    
    expect(results).toHaveLength(1);
    expect(results?.[0]?.content).toContain('tartas de queso');
    expect((results?.[0] as any)?.distance).toBeLessThan(0.1);
    
    const { prisma } = await import('../db/prisma');
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

});
