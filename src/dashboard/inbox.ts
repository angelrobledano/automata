import { prisma } from '../db/prisma';

export async function getInboxSessions(commerceId: string) {
  return prisma.session.findMany({
    where: { commerceId, isTest: false },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}

export async function requestHuman(sessionId: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { status: 'HUMAN_REQUESTED' }
  });
}
