"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FeatureGuard_1 = require("../../billing/core/FeatureGuard");
const prisma_1 = require("../../db/prisma");
// Mock Prisma
vitest_1.vi.mock('../../db/prisma', () => ({
    prisma: {
        commerce: {
            findUnique: vitest_1.vi.fn(),
        },
        subscription: {
            findFirst: vitest_1.vi.fn(),
        },
        consumption: {
            findFirst: vitest_1.vi.fn(),
            upsert: vitest_1.vi.fn(),
        },
    },
}));
(0, vitest_1.describe)('FeatureGuard', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should deny execution if commerce does not exist', async () => {
        prisma_1.prisma.commerce.findUnique.mockResolvedValue(null);
        const result = await FeatureGuard_1.FeatureGuard.canExecute('invalid_id', 'max_conversations');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe('Commerce not found');
    });
    (0, vitest_1.it)('should deny execution if there is no active subscription', async () => {
        prisma_1.prisma.commerce.findUnique.mockResolvedValue({
            id: 'com_123',
            subscriptions: []
        });
        const result = await FeatureGuard_1.FeatureGuard.canExecute('com_123', 'max_conversations');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe('No active subscription');
    });
    (0, vitest_1.it)('should allow execution if feature is UNLIMITED', async () => {
        prisma_1.prisma.commerce.findUnique.mockResolvedValue({
            id: 'com_123',
            subscriptions: [{
                    status: 'ACTIVE',
                    plan: {
                        features: [{ featureKey: 'max_conversations', value: 'UNLIMITED' }]
                    }
                }]
        });
        const result = await FeatureGuard_1.FeatureGuard.canExecute('com_123', 'max_conversations');
        (0, vitest_1.expect)(result.allowed).toBe(true);
    });
    (0, vitest_1.it)('should deny execution if HARD_LIMIT is reached', async () => {
        prisma_1.prisma.commerce.findUnique.mockResolvedValue({
            id: 'com_123',
            overageBehavior: 'HARD_LIMIT',
            subscriptions: [{
                    status: 'ACTIVE',
                    currentPeriodStart: new Date(),
                    plan: {
                        features: [{ featureKey: 'max_conversations', value: '100' }]
                    }
                }]
        });
        prisma_1.prisma.consumption.findFirst.mockResolvedValue({
            amount: 100 // Already at limit
        });
        const result = await FeatureGuard_1.FeatureGuard.canExecute('com_123', 'max_conversations');
        (0, vitest_1.expect)(result.allowed).toBe(false);
        (0, vitest_1.expect)(result.reason).toContain('Limit reached');
    });
    (0, vitest_1.it)('should ALLOW execution if METERED_BILLING is enabled even if limit reached', async () => {
        prisma_1.prisma.commerce.findUnique.mockResolvedValue({
            id: 'com_123',
            overageBehavior: 'METERED_BILLING',
            subscriptions: [{
                    status: 'ACTIVE',
                    currentPeriodStart: new Date(),
                    plan: {
                        features: [{ featureKey: 'max_conversations', value: '100' }]
                    }
                }]
        });
        prisma_1.prisma.consumption.findFirst.mockResolvedValue({
            amount: 150 // Over limit
        });
        const result = await FeatureGuard_1.FeatureGuard.canExecute('com_123', 'max_conversations');
        (0, vitest_1.expect)(result.allowed).toBe(true);
    });
});
//# sourceMappingURL=FeatureGuard.test.js.map