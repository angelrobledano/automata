export declare function createEmbedding(text: string): Promise<number[]>;
export declare function addDocumentChunk(commerceId: string, sourceId: string, content: string): Promise<any>;
/**
 * Recibe un archivo, extrae su texto, lo divide en chunks y lo almacena.
 */
export declare function addDocumentFromFile(commerceId: string, filename: string, buffer: Buffer, category?: string): Promise<{
    sourceId: string;
    chunksProcessed: number;
}>;
export declare function addTextThread(commerceId: string, title: string, text: string, category?: string): Promise<{
    sourceId: string;
    chunksProcessed: number;
}>;
export declare function updateTextThread(sourceId: string, title: string, text: string): Promise<{
    sourceId: string;
    chunksProcessed: number;
}>;
export declare function searchSimilarChunks(commerceId: string, query: string, limit?: number): Promise<{
    id: string;
    content: string;
    sourcename: string;
    rrf_score: number;
}[]>;
export declare function purgeSemanticCache(commerceId: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map