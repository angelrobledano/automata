import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureGuard } from '../../billing/core/FeatureGuard';
import { prisma } from '../../db/prisma';

// Mock Prisma
vi.mock('../../db/prisma', () => ({
  prisma: {
    commerce: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    consumption: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe('FeatureGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny execution if commerce does not exist', async () => {
    (prisma.commerce.findUnique as any).mockResolvedValue(null);
    const result = await FeatureGuard.canExecute('invalid_id', 'max_conversations');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Commerce not found');
  });

  it('should deny execution if there is no active subscription', async () => {
    (prisma.commerce.findUnique as any).mockResolvedValue({
      id: 'com_123',
      subscriptions: []
    });
    const result = await FeatureGuard.canExecute('com_123', 'max_conversations');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No active subscription');
  });

  it('should allow execution if feature is UNLIMITED', async () => {
    (prisma.commerce.findUnique as any).mockResolvedValue({
      id: 'com_123',
      subscriptions: [{
        status: 'ACTIVE',
        plan: {
          features: [{ featureKey: 'max_conversations', value: 'UNLIMITED' }]
        }
      }]
    });
    const result = await FeatureGuard.canExecute('com_123', 'max_conversations');
    expect(result.allowed).toBe(true);
  });

  it('should deny execution if HARD_LIMIT is reached', async () => {
    (prisma.commerce.findUnique as any).mockResolvedValue({
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
    
    (prisma.consumption.findFirst as any).mockResolvedValue({
      amount: 100 // Already at limit
    });

    const result = await FeatureGuard.canExecute('com_123', 'max_conversations');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Limit reached');
  });

  it('should ALLOW execution if METERED_BILLING is enabled even if limit reached', async () => {
    (prisma.commerce.findUnique as any).mockResolvedValue({
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
    
    (prisma.consumption.findFirst as any).mockResolvedValue({
      amount: 150 // Over limit
    });

    const result = await FeatureGuard.canExecute('com_123', 'max_conversations');
    expect(result.allowed).toBe(true);
  });

});
