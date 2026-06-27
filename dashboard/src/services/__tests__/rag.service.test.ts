import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RagService } from '../rag.service';

vi.mock('../../../../src/db/prisma', () => ({
  prisma: {
    documentChunk: {
      findMany: vi.fn()
    }
  }
}));

describe('RagService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractKeywords', () => {
    it('should ignore stop words and punctuation', () => {
      const msg = 'Hola, por favor, quiero saber cuánto cuesta la camiseta negra.';
      const keywords = RagService.extractKeywords(msg);
      
      expect(keywords).toContain('camiseta');
      expect(keywords).toContain('negra');
      expect(keywords).not.toContain('hola');
      expect(keywords).not.toContain('por');
      expect(keywords).not.toContain('favor');
      expect(keywords).not.toContain('quiero');
      expect(keywords).not.toContain('saber');
      expect(keywords).not.toContain('cuánto');
      expect(keywords).not.toContain('cuesta');
      expect(keywords).not.toContain('la');
    });

    it('should return unique keywords in lowercase', () => {
      const msg = 'Gafas rojas y GAFAS azules';
      const keywords = RagService.extractKeywords(msg);
      
      expect(keywords.length).toBe(3);
      expect(keywords).toContain('gafas');
      expect(keywords).toContain('rojas');
      expect(keywords).toContain('azules');
    });
  });

  describe('retrieveContext', () => {
    it('should query Prisma with keyword conditions', async () => {
      const { prisma } = await import('../../../../src/db/prisma');
      (prisma.documentChunk.findMany as any).mockResolvedValue([
        { content: 'Las camisetas negras valen 20€' }
      ]);

      const context = await RagService.retrieveContext('comm-1', 'camiseta negra');
      
      expect(prisma.documentChunk.findMany).toHaveBeenCalledWith({
        where: {
          source: { commerceId: 'comm-1' },
          OR: [
            { content: { contains: 'camiseta', mode: 'insensitive' } },
            { content: { contains: 'negra', mode: 'insensitive' } }
          ]
        },
        take: 5
      });

      expect(context).toContain('INFORMACIÓN DE LA BASE DE CONOCIMIENTO');
      expect(context).toContain('Las camisetas negras valen 20€');
    });

    it('should use fallback if no keywords found', async () => {
      const { prisma } = await import('../../../../src/db/prisma');
      (prisma.documentChunk.findMany as any).mockResolvedValue([
        { content: 'Fallback info' }
      ]);

      const context = await RagService.retrieveContext('comm-1', 'hola por favor que es'); // All stop words
      
      // The second call (fallback) uses take: 3
      expect(prisma.documentChunk.findMany).toHaveBeenCalledWith({
        where: { source: { commerceId: 'comm-1' } },
        take: 3
      });

      expect(context).toContain('Fallback info');
    });
  });
});
