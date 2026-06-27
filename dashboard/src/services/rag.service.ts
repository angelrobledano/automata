import { prisma } from '../../../src/db/prisma';

export class RagService {
  /**
   * Extrae palabras clave de un mensaje eliminando las "stop words".
   */
  static extractKeywords(message: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
      'si', 'no', 'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin',
      'como', 'que', 'qué', 'es', 'son', 'tiene', 'tienen', 'hola', 'buenas',
      'tardes', 'días', 'gracias', 'por', 'favor', 'quiero', 'necesito', 'saber',
      'tienes', 'hay', 'donde', 'cómo', 'cuando', 'cuanto', 'cuánto', 'vale',
      'cuesta', 'precio'
    ]);

    const words = message.toLowerCase()
      .replace(/[^\w\sáéíóúüñ]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
      
    return Array.from(new Set(words)); // Unique keywords
  }

  /**
   * Recupera los fragmentos de documentos más relevantes basados en palabras clave.
   */
  static async retrieveContext(commerceId: string, userMessage: string): Promise<string> {
    try {
      const keywords = this.extractKeywords(userMessage);
      
      // If no valid keywords, we can still fetch some general context or return empty
      // For MVP, if no keywords, we fetch the most recent chunks as fallback
      let chunks: any[] = [];

      if (keywords.length > 0) {
        // Buscamos fragmentos que contengan alguna de las palabras clave (búsqueda case-insensitive no es nativa en sqlite/prisma fácil con OR)
        // Para PostgreSQL con Prisma podemos usar `contains` con `mode: 'insensitive'`
        const orConditions = keywords.map(kw => ({
          content: { contains: kw, mode: 'insensitive' as any }
        }));

        chunks = await prisma.documentChunk.findMany({
          where: {
            source: { commerceId },
            OR: orConditions
          },
          take: 5 // Limitar para no exceder contexto
        });
      }

      // Fallback: si no hay match de keywords, traemos 3 fragmentos generales
      if (chunks.length === 0) {
        chunks = await prisma.documentChunk.findMany({
          where: { source: { commerceId } },
          take: 3
        });
      }

      if (chunks.length === 0) {
        return '';
      }

      // Concatenar el contenido
      const contextText = chunks.map((c, i) => `Fragmento ${i + 1}:\n${c.content}`).join('\n\n');
      
      return `\n\n--- INFORMACIÓN DE LA BASE DE CONOCIMIENTO DE LA TIENDA ---\n${contextText}\n-----------------------------------------------------------`;

    } catch (error) {
      console.error('Error in RAG retrieval:', error);
      return ''; // Graceful degradation: si falla, devolvemos contexto vacío
    }
  }
}
