import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import Stripe from 'stripe';

const constructEventMock = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      webhooks = {
        constructEvent: constructEventMock,
      };
    }
  };
});

vi.mock('../../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: {
      update: vi.fn(),
      updateMany: vi.fn(),
    }
  }
}));

describe('Stripe Webhook API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (body: any, signature: string | null) => {
    const headers = new Headers();
    if (signature) headers.set('stripe-signature', signature);
    
    return new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  };

  it('should return 400 if stripe-signature is missing', async () => {
    const req = createMockRequest({ type: 'test' }, null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing stripe-signature');
  });

  it('should return 400 if signature verification fails', async () => {
    constructEventMock.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const req = createMockRequest({ type: 'test' }, 'invalid_sig');
    const res = await POST(req);
    
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Webhook Error: Invalid signature');
  });

  it('should handle checkout.session.completed and update commerce plan to PRO', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { commerceId: 'commerce-123' },
          customer: 'cus_123'
        }
      }
    };
    
    constructEventMock.mockReturnValue(mockEvent);

    const { prisma } = await import('../../../../../../../src/db/prisma');
    (prisma.commerce.update as any).mockResolvedValue({ id: 'commerce-123', plan: 'PRO' });

    const req = createMockRequest(mockEvent, 'valid_sig');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(prisma.commerce.update).toHaveBeenCalledWith({
      where: { id: 'commerce-123' },
      data: { plan: 'PRO', stripeCustomerId: 'cus_123' }
    });
  });

  it('should handle customer.subscription.deleted and update commerce plan to FREE', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_123'
        }
      }
    };
    
    constructEventMock.mockReturnValue(mockEvent);

    const { prisma } = await import('../../../../../../../src/db/prisma');
    (prisma.commerce.updateMany as any).mockResolvedValue({ count: 1 });

    const req = createMockRequest(mockEvent, 'valid_sig');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    expect(prisma.commerce.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_123' },
      data: { plan: 'FREE' }
    });
  });
});
