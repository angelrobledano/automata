"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateSession = getOrCreateSession;
exports.getSessionMessages = getSessionMessages;
exports.addMessageToSession = addMessageToSession;
const prisma_1 = require("./prisma");
// Recupera o crea una sesión activa para un identificador de cliente en un comercio
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
                status: 'ACTIVE',
            },
        });
    }
    else if (session.status === 'CLOSED') {
        // Reactivamos si estaba cerrado
        session = await prisma_1.prisma.session.update({
            where: { id: session.id },
            data: { status: 'ACTIVE' },
        });
    }
    return session;
}
// Obtiene el historial de mensajes de la sesión
async function getSessionMessages(sessionId) {
    return prisma_1.prisma.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
    });
}
// Añade un mensaje al historial
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