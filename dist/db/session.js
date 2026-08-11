"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateSession = getOrCreateSession;
exports.getSessionMessages = getSessionMessages;
exports.addMessageToSession = addMessageToSession;
const prisma_1 = require("./prisma");
async function getOrCreateSession(commerceId, customerIdentifier, channelConnectionId) {
    let session = await prisma_1.prisma.session.findUnique({
        where: {
            commerceId_customerIdentifier_channelConnectionId: {
                commerceId,
                customerIdentifier,
                channelConnectionId,
            },
        },
    });
    if (!session) {
        session = await prisma_1.prisma.session.create({
            data: {
                commerceId,
                customerIdentifier,
                channelConnectionId,
                status: 'AI_ACTIVE',
                controlBy: 'AI'
            },
        });
    }
    else if (session.status === 'RESOLVED') {
        // Si estaba resuelta y entra un nuevo mensaje, reactivar gestionada por IA
        session = await prisma_1.prisma.session.update({
            where: { id: session.id },
            data: {
                status: 'AI_ACTIVE',
                controlBy: 'AI',
                humanReason: null,
                waitingSince: null
            },
        });
    }
    return session;
}
async function getSessionMessages(sessionId) {
    return prisma_1.prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
    });
}
async function addMessageToSession(sessionId, role, content) {
    return prisma_1.prisma.message.create({
        data: {
            sessionId,
            role,
            content,
        },
    });
}
//# sourceMappingURL=session.js.map