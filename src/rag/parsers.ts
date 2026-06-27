// Polyfill para pdf-parse en entornos Node (evita el error DOMMatrix is not defined)
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {};
}

const pdfParse = require('pdf-parse/lib/pdf-parse.js');
import * as xlsx from 'xlsx';
import * as mammoth from 'mammoth';

export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function parseExcel(buffer: Buffer): string {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  let text = '';
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convierte cada hoja a formato CSV (texto crudo separado por comas)
    const csv = xlsx.utils.sheet_to_csv(sheet);
    text += `\n--- Sheet: ${sheetName} ---\n${csv}`;
  }
  
  return text;
}

export function parseTxt(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

/**
 * Determina el tipo de archivo según la extensión y extrae el texto
 */
export async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return parsePdf(buffer);
    case 'docx':
      return parseDocx(buffer);
    case 'xlsx':
    case 'xls':
    case 'csv':
      return parseExcel(buffer);
    case 'txt':
    case 'md':
      return parseTxt(buffer);
    default:
      throw new Error(`De momento, solo podemos leer archivos PDF, Word, Excel o texto plano (.txt).`);
  }
}
