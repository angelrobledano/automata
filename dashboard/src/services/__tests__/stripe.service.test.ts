import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckoutSession, mapStripeStatusToPlan } from '../stripe.service';
import Stripe from 'stripe';

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      checkout = {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-url' }),
        },
      };
    }
  };
});

describe('Stripe Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should throw an error if STRIPE_SECRET_KEY is not configured', async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      
      await expect(createCheckoutSession('commerce-123')).rejects.toThrow('Stripe secret key not configured');
      
      process.env.STRIPE_SECRET_KEY = originalKey; // Restore
    });

    it('should return a valid stripe checkout url for a given commerceId', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
      
      const url = await createCheckoutSession('commerce-123');
      
      expect(url).toBe('https://checkout.stripe.com/test-url');
    });
  });

  describe('mapStripeStatusToPlan', () => {
    it('should return PRO for active status', () => {
      expect(mapStripeStatusToPlan('active')).toBe('PRO');
    });

    it('should return FROZEN for past_due status', () => {
      expect(mapStripeStatusToPlan('past_due')).toBe('FROZEN');
    });

    it('should return FREE for canceled status', () => {
      expect(mapStripeStatusToPlan('canceled')).toBe('FREE');
    });

    it('should return FREE for unknown statuses', () => {
      expect(mapStripeStatusToPlan('unpaid')).toBe('FREE');
    });
  });
});
