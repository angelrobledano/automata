import { prisma } from './prisma';

export async function getOrCreateSession(commerceId: string, customerIdentifier: string, channelConnectionId: string) {
  let session = await prisma.session.findUnique({
    where: {
      commerceId_customerIdentifier_channelConnectionId: {
        commerceId,
        customerIdentifier,
        channelConnectionId,
      },
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        commerceId,
        customerIdentifier,
        channelConnectionId,
        status: 'AI_ACTIVE',
        controlBy: 'AI'
      },
    });
  } else if (session.status === 'RESOLVED') {
    // Si estaba resuelta y entra un nuevo mensaje, reactivar gestionada por IA
    session = await prisma.session.update({
      where: { id: session.id },
      data: { 
        status: 'AI_ACTIVE',
        controlBy: 'AI',
        humanReason: null,
        waitingSince: null
      },
    });
  }

  return session;
}

export async function getSessionMessages(sessionId: string) {
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addMessageToSession(sessionId: string, role: 'user' | 'assistant' | 'system', content: string) {
  return prisma.message.create({
    data: {
      sessionId,
      role,
      content,
    },
  });
}
