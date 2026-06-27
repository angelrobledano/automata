"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./src/rag/index");
const prisma_1 = require("./src/db/prisma");
const fs_1 = __importDefault(require("fs"));
async function runAudit() {
    console.log("=== INICIANDO AUDITORIA DE RAG ===");
    try {
        // 1. Limpiar test commerce
        await prisma_1.prisma.knowledgeSource.deleteMany({ where: { commerceId: 'audit-test-id' } });
        // 2. Test Documento Vacío / Muy Pequeño
        const emptyBuffer = Buffer.from("Hola");
        const resEmpty = await (0, index_1.addDocumentFromFile)('audit-test-id', 'vacio.txt', emptyBuffer);
        console.log("Resultado Vacio:", resEmpty);
        // 3. Test Documento Válido
        const validContent = "El horario de la tienda es de lunes a viernes de 9 a 20h.\n\nTambién abrimos los sábados por la mañana de 10 a 14h.\n\nNuestra política de devoluciones es de 30 días con ticket de compra.";
        const validBuffer = Buffer.from(validContent);
        const resValid = await (0, index_1.addDocumentFromFile)('audit-test-id', 'horarios.txt', validBuffer);
        console.log("Resultado Valido:", resValid);
        // 4. Búsqueda RAG (si OpenAI no está configurado, esto fallará)
        try {
            const searchRes = await (0, index_1.searchSimilarChunks)('audit-test-id', "cuando abris los sabados?");
            console.log("Resultados Búsqueda RAG:", searchRes.map(s => s.content));
        }
        catch (e) {
            console.log("Fallo Búsqueda RAG (esperado si no hay API key):", e.message);
        }
        // 5. Verificar Persistencia Vectorial
        const chunks = await prisma_1.prisma.documentChunk.findMany({
            where: { knowledgeSourceId: resValid.sourceId }
        });
        console.log(`Persistencia: Encontrados ${chunks.length} chunks en DB para el source valido.`);
        // 6. Test Modificar / Borrar
        const updateRes = await (0, index_1.updateTextThread)(resValid.sourceId, 'horarios.txt (Modificado)', "Solo abrimos de 9 a 14h todos los días.\n\nLas devoluciones son de 15 días.");
        console.log("Resultado Update:", updateRes);
        const countAfterUpdate = await prisma_1.prisma.documentChunk.count({
            where: { knowledgeSourceId: resValid.sourceId }
        });
        console.log(`Chunks tras update: ${countAfterUpdate}`);
    }
    catch (error) {
        console.error("ERROR EN AUDITORIA:", error);
    }
    finally {
        // Limpieza
        await prisma_1.prisma.knowledgeSource.deleteMany({ where: { commerceId: 'audit-test-id' } });
    }
}
runAudit();
//# sourceMappingURL=audit-rag.js.map