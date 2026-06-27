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
const vitest_1 = require("vitest");
vitest_1.vi.mock('../db/prisma', () => ({
    prisma: {
        session: {
            findMany: vitest_1.vi.fn().mockResolvedValue([
                { id: 'session-1', customerPhone: '123', status: 'HUMAN_REQUESTED' },
                { id: 'session-2', customerPhone: '456', status: 'ACTIVE' },
            ]),
            update: vitest_1.vi.fn(),
        },
        message: {
            findMany: vitest_1.vi.fn().mockResolvedValue([
                { role: 'user', content: 'Quiero hablar con un humano' }
            ])
        }
    },
}));
const inbox_1 = require("../dashboard/inbox");
(0, vitest_1.describe)('Dashboard Inbox Module', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('debería recuperar las sesiones de un comercio para el Inbox', async () => {
        const sessions = await (0, inbox_1.getInboxSessions)('commerce-1');
        (0, vitest_1.expect)(sessions).toHaveLength(2);
        (0, vitest_1.expect)(sessions[0].status).toBe('HUMAN_REQUESTED');
        // Verificamos que se llame a prisma
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../db/prisma')));
        (0, vitest_1.expect)(prisma.session.findMany).toHaveBeenCalledWith({
            where: { commerceId: 'commerce-1' },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
    });
    (0, vitest_1.it)('debería actualizar el estado de la sesión a HUMAN_REQUESTED', async () => {
        const { requestHuman } = await Promise.resolve().then(() => __importStar(require('../dashboard/inbox')));
        // Mock the update
        vitest_1.vi.mocked((await Promise.resolve().then(() => __importStar(require('../db/prisma')))).prisma.session.update).mockResolvedValue({
            id: 'session-1',
            commerceId: 'c1',
            customerPhone: '123',
            status: 'HUMAN_REQUESTED',
            context: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const updated = await requestHuman('session-1');
        (0, vitest_1.expect)(updated.status).toBe('HUMAN_REQUESTED');
        const { prisma } = await Promise.resolve().then(() => __importStar(require('../db/prisma')));
        (0, vitest_1.expect)(prisma.session.update).toHaveBeenCalledWith({
            where: { id: 'session-1' },
            data: { status: 'HUMAN_REQUESTED' }
        });
    });
});
//# sourceMappingURL=dashboard.test.js.map