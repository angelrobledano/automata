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
exports.parsePdf = parsePdf;
exports.parseDocx = parseDocx;
exports.parseExcel = parseExcel;
exports.parseTxt = parseTxt;
exports.extractTextFromFile = extractTextFromFile;
// Polyfill para pdf-parse en entornos Node (evita el error DOMMatrix is not defined)
if (typeof global !== 'undefined' && !global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
    };
}
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const xlsx = __importStar(require("xlsx"));
const mammoth = __importStar(require("mammoth"));
async function parsePdf(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
}
async function parseDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}
function parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let text = '';
    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
            // Convierte cada hoja a formato CSV (texto crudo separado por comas)
            const csv = xlsx.utils.sheet_to_csv(sheet);
            text += `\n--- Sheet: ${sheetName} ---\n${csv}`;
        }
    }
    return text;
}
function parseTxt(buffer) {
    return buffer.toString('utf-8');
}
/**
 * Determina el tipo de archivo según la extensión y extrae el texto
 */
async function extractTextFromFile(buffer, filename) {
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
//# sourceMappingURL=parsers.js.map