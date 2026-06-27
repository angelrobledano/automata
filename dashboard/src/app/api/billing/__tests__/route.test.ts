import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../../../../../../src/db/prisma', () => ({
  prisma: {
    commerce: {
      findUnique: vi.fn(),
    }
  }
}));

describe('Billing API GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (cookieToken: string | null, searchParams: string = '') => {
    const req = new Request(`http://localhost/api/billing${searchParams}`);
    if (cookieToken) {
      req.headers.set('cookie', `token=${cookieToken}`);
    }
    return req;
  };

  it('should return 401 if token is missing', async () => {
    const req = createMockRequest(null);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should return 401 if token is invalid', async () => {
    const { verifyToken } = await import('@/lib/jwt');
    (verifyToken as any).mockResolvedValue(null);

    const req = createMockRequest('invalid_token');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should only return billing data for the commerceId in the JWT (Multi-Tenant isolation)', async () => {
    const { verifyToken } = await import('@/lib/jwt');
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-123' });

    const { prisma } = await import('../../../../../../src/db/prisma');
    (prisma.commerce.findUnique as any).mockResolvedValue({
      id: 'commerce-123',
      plan: 'PRO',
      stripeCustomerId: 'cus_123',
    });

    // Attacker tries to access commerce-999
    const req = createMockRequest('valid_token', '?commerceId=commerce-999');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    
    // DB should have been queried with commerce-123, NOT commerce-999
    expect(prisma.commerce.findUnique).toHaveBeenCalledWith({
      where: { id: 'commerce-123' },
      select: { plan: true, stripeCustomerId: true }
    });
    expect(data.plan).toBe('PRO');
  });

  it('should return 404 if commerce is not found', async () => {
    const { verifyToken } = await import('@/lib/jwt');
    (verifyToken as any).mockResolvedValue({ commerceId: 'commerce-unknown' });

    const { prisma } = await import('../../../../../../src/db/prisma');
    (prisma.commerce.findUnique as any).mockResolvedValue(null);

    const req = createMockRequest('valid_token');
    const res = await GET(req);
    
    expect(res.status).toBe(404);
  });
});
