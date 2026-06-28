import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class FeatureGuard {
  
  /**
   * Checks if a commerce can consume an amount of a specific feature.
   * Evaluates limits and overage behavior.
   */
  static async canExecute(
    commerceId: string, 
    featureKey: string, 
    requestedAmount: number = 1
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            plan: {
              include: {
                features: true
              }
            }
          }
        }
      }
    });

    if (!commerce) {
      return { allowed: false, reason: 'Commerce not found' };
    }

    // 1. Get the active plan
    const activeSub = commerce.subscriptions[0];
    if (!activeSub) {
      // Free tier logic or blocked
      return { allowed: false, reason: 'No active subscription' };
    }

    // 2. Find the feature limit in the plan
    const featureConfig = activeSub.plan.features.find(f => f.featureKey === featureKey);
    
    // If not configured, assume it's disabled by default for safety, or you could assume unlimited.
    // Let's assume disabled if not found.
    if (!featureConfig) {
      return { allowed: false, reason: `Feature ${featureKey} not available in current plan` };
    }

    if (featureConfig.value === 'UNLIMITED') {
      return { allowed: true };
    }

    if (featureConfig.value === 'true' || featureConfig.value === 'false') {
       if (featureConfig.value === 'true') return { allowed: true };
       return { allowed: false, reason: `Feature ${featureKey} is disabled in current plan` };
    }

    const limit = parseInt(featureConfig.value, 10);
    if (isNaN(limit)) {
      console.warn(`Invalid limit format for ${featureKey}: ${featureConfig.value}`);
      return { allowed: false, reason: 'Invalid plan configuration' };
    }

    // 3. Get current consumption
    // Get start of current month (simplification, real billing uses currentPeriodStart)
    const now = new Date();
    const periodStart = activeSub.currentPeriodStart;
    
    const consumption = await prisma.consumption.findFirst({
      where: {
        commerceId,
        metricKey: featureKey,
        periodStart: { lte: now },
        periodEnd: { gte: now }
      }
    });

    const currentAmount = consumption ? consumption.amount : 0;
    const projectedAmount = currentAmount + requestedAmount;

    if (projectedAmount <= limit) {
      return { allowed: true };
    }

    // 4. Evaluate Overage Behavior
    if (commerce.overageBehavior === 'METERED_BILLING') {
      // Client chose to pay for excess. Allow it, billing system will charge at end of month.
      return { allowed: true };
    }

    // Default to HARD_LIMIT
    return { allowed: false, reason: `Limit reached for ${featureKey}. Max: ${limit}, Current: ${currentAmount}` };
  }

  /**
   * Tracks consumption of a metric
   */
  static async trackConsumption(commerceId: string, metricKey: string, amount: number = 1): Promise<void> {
    const activeSub = await prisma.subscription.findFirst({
      where: { commerceId, status: 'ACTIVE' }
    });

    if (!activeSub) return; // Silent return or throw depending on strictness

    const now = new Date();
    // Assuming monthly alignment with sub
    const periodStart = activeSub.currentPeriodStart;
    const periodEnd = activeSub.currentPeriodEnd;

    await prisma.consumption.upsert({
      where: {
        commerceId_metricKey_periodStart: {
          commerceId,
          metricKey,
          periodStart
        }
      },
      update: {
        amount: { increment: amount }
      },
      create: {
        commerceId,
        metricKey,
        periodStart,
        periodEnd,
        amount
      }
    });
  }
}
