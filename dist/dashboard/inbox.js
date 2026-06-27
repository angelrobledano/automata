"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInboxSessions = getInboxSessions;
exports.requestHuman = requestHuman;
const prisma_1 = require("../db/prisma");
async function getInboxSessions(commerceId) {
    return prisma_1.prisma.session.findMany({
        where: { commerceId, isTest: false },
        orderBy: { updatedAt: 'desc' },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}
async function requestHuman(sessionId) {
    return prisma_1.prisma.session.update({
        where: { id: sessionId },
        data: { status: 'HUMAN_REQUESTED' }
    });
}
//# sourceMappingURL=inbox.js.map