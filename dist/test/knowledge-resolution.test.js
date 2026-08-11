"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../db/prisma");
const knowledge_resolver_1 = require("../rag/knowledge-resolver");
const quality_layer_1 = require("../rag/quality-layer");
async function runTests() {
    console.log('====================================================');
    console.log('🧪 EJECUTANDO BATERÍA DE TESTS: KNOWLEDGE & QUALITY LAYER');
    console.log('====================================================\n');
    const testCommerceId = 'commerce-seed-id';
    // Asegurar que el comercio exista
    await prisma_1.prisma.commerce.upsert({
        where: { id: testCommerceId },
        update: {},
        create: {
            id: testCommerceId,
            name: 'Comercio Pruebas RAG',
            systemPrompt: 'Eres un asistente IA.'
        }
    });
    // Limpiar reglas previas de test
    await prisma_1.prisma.structuredKnowledgeRule.deleteMany({
        where: { commerceId: testCommerceId }
    });
    // 1. Crear regla: Horario habitual (Prioridad 100)
    await prisma_1.prisma.structuredKnowledgeRule.create({
        data: {
            commerceId: testCommerceId,
            type: 'BUSINESS_HOURS',
            name: 'Horario habitual',
            priority: 100,
            daysOfWeek: [1, 2, 3, 4, 5],
            isOverride: false,
            payload: {
                hours: [{ open: '09:00', close: '20:00' }],
                note: 'De lunes a viernes'
            }
        }
    });
    // 2. Crear regla: Horario de verano (Prioridad 300, Override = true)
    await prisma_1.prisma.structuredKnowledgeRule.create({
        data: {
            commerceId: testCommerceId,
            type: 'BUSINESS_HOURS',
            name: 'Horario de verano',
            priority: 300,
            monthsOfYear: [6, 7, 8, 9],
            daysOfWeek: [1, 2, 3, 4, 5],
            isOverride: true,
            payload: {
                hours: [
                    { open: '09:00', close: '14:00' },
                    { open: '19:30', close: '21:30' }
                ],
                note: 'Horario estacional de verano'
            }
        }
    });
    // 3. Crear regla: Festivo 15 de Agosto (Prioridad 500, Override = true, isClosed = true)
    await prisma_1.prisma.structuredKnowledgeRule.create({
        data: {
            commerceId: testCommerceId,
            type: 'HOLIDAY_CLOSURE',
            name: 'Festivo 15 de Agosto',
            priority: 500,
            specificDate: new Date('2026-08-15T00:00:00.000Z'),
            isOverride: true,
            isClosed: true,
            payload: {
                hours: [],
                note: 'Cierre por festivo'
            }
        }
    });
    // ====================================================
    // PRUEBA 1: PREGUNTA EN VERANO ("¿Abrís por la tarde en verano?")
    // ====================================================
    console.log('🔹 PRUEBA 1: Resolución de Horario de Verano en Julio/Agosto');
    const summerDate = new Date('2026-07-15T12:00:00.000Z');
    const res1 = await (0, knowledge_resolver_1.resolveApplicableFacts)(testCommerceId, '¿Abrís por la tarde en verano?', summerDate);
    console.log(`- Intención detectada: ${res1.intent}`);
    console.log(`- Regla activa resuelta: ${res1.activeRules[0]?.name}`);
    console.log(`- Reglas anuladas por prioridad: ${res1.overriddenRuleNames.join(', ')}`);
    console.log(`- Hecho resuelto: ${res1.resolvedFactsText}`);
    console.log(`- Respuesta determinista recomendada: ${res1.deterministicAnswer}\n`);
    if (res1.activeRules[0]?.name !== 'Horario de verano') {
        throw new Error('❌ TEST 1 FALLÓ: Debió seleccionar el Horario de verano.');
    }
    if (!res1.overriddenRuleNames.includes('Horario habitual')) {
        throw new Error('❌ TEST 1 FALLÓ: El Horario habitual debió ser anulado por el Horario de verano.');
    }
    console.log('✅ PRUEBA 1 PASÓ CON ÉXITO.\n');
    // ====================================================
    // PRUEBA 2: DETECCIÓN DE CONTRADICCIÓN EN RESPONSE QUALITY LAYER
    // ====================================================
    console.log('🔹 PRUEBA 2: Detección de Contradicción (Quality Layer)');
    const problematicResponse = 'Sí, abrimos en verano. Nuestro horario es de 9:00 a 20:00 de lunes a viernes, y en las tardes de verano estamos abiertos de 19:30 a 21:30.';
    const qual1 = (0, quality_layer_1.validateResponseQuality)(problematicResponse, res1);
    console.log(`- ¿Pasó el filtro de calidad?: ${qual1.passed}`);
    console.log(`- Errores detectados: ${qual1.failures.join(', ')}`);
    console.log(`- Feedback para autorreparación: ${qual1.feedback}\n`);
    if (qual1.passed || !qual1.failures.includes('CONTRADICTION_DETECTED')) {
        throw new Error('❌ TEST 2 FALLÓ: No detectó la contradicción entre 20:00 y 19:30-21:30.');
    }
    console.log('✅ PRUEBA 2 PASÓ CON ÉXITO (Contradicción detectada y rechazada correctamente).\n');
    // ====================================================
    // PRUEBA 3: SOBREESCRITURA POR FESTIVO (15 DE AGOSTO)
    // ====================================================
    console.log('🔹 PRUEBA 3: Sobreescritura por Festivo el 15 de Agosto');
    const holidayDate = new Date('2026-08-15T12:00:00.000Z');
    const res3 = await (0, knowledge_resolver_1.resolveApplicableFacts)(testCommerceId, '¿Abrís el 15 de agosto por la tarde?', holidayDate);
    console.log(`- Regla activa resuelta: ${res3.activeRules[0]?.name}`);
    console.log(`- ¿Está cerrado?: ${res3.isClosed}`);
    console.log(`- Respuesta determinista recomendada: ${res3.deterministicAnswer}\n`);
    if (!res3.isClosed || res3.activeRules[0]?.name !== 'Festivo 15 de Agosto') {
        throw new Error('❌ TEST 3 FALLÓ: El festivo debía anular el horario de verano.');
    }
    console.log('✅ PRUEBA 3 PASÓ CON ÉXITO.\n');
    console.log('====================================================');
    console.log('🎉 TODOS LOS TESTS HAN PASADO DE FORMA SATISFACTORIA (0 ERRORES)');
    console.log('====================================================');
}
runTests()
    .then(() => process.exit(0))
    .catch((err) => {
    console.error('❌ ERROR EN PRUEBAS:', err);
    process.exit(1);
});
//# sourceMappingURL=knowledge-resolution.test.js.map