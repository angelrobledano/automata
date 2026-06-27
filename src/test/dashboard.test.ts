import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'session-1', customerPhone: '123', status: 'HUMAN_REQUESTED' },
        { id: 'session-2', customerPhone: '456', status: 'ACTIVE' },
      ]),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn().mockResolvedValue([
        { role: 'user', content: 'Quiero hablar con un humano' }
      ])
    }
  },
}));

import { getInboxSessions } from '../dashboard/inbox';

describe('Dashboard Inbox Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería recuperar las sesiones de un comercio para el Inbox', async () => {
    const sessions = await getInboxSessions('commerce-1');
    expect(sessions).toHaveLength(2);
    expect(sessions[0].status).toBe('HUMAN_REQUESTED');
    
    // Verificamos que se llame a prisma
    const { prisma } = await import('../db/prisma');
    expect(prisma.session.findMany).toHaveBeenCalledWith({
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

  it('debería actualizar el estado de la sesión a HUMAN_REQUESTED', async () => {
    const { requestHuman } = await import('../dashboard/inbox');
    
    // Mock the update
    vi.mocked((await import('../db/prisma')).prisma.session.update).mockResolvedValue({
      id: 'session-1',
      commerceId: 'c1',
      customerPhone: '123',
      status: 'HUMAN_REQUESTED',
      context: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await requestHuman('session-1');
    expect(updated.status).toBe('HUMAN_REQUESTED');
    
    const { prisma } = await import('../db/prisma');
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'HUMAN_REQUESTED' }
    });
  });
});
