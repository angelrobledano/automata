export declare function parsePdf(buffer: Buffer): Promise<string>;
export declare function parseDocx(buffer: Buffer): Promise<string>;
export declare function parseExcel(buffer: Buffer): string;
export declare function parseTxt(buffer: Buffer): string;
/**
 * Determina el tipo de archivo según la extensión y extrae el texto
 */
export declare function extractTextFromFile(buffer: Buffer, filename: string): Promise<string>;
//# sourceMappingURL=parsers.d.ts.map