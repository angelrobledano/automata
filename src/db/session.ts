import { prisma } from './prisma';

// Recupera o crea una sesión activa para un identificador de cliente en un comercio
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
        status: 'ACTIVE',
      },
    });
  } else if (session.status === 'CLOSED') {
    // Reactivamos si estaba cerrado
    session = await prisma.session.update({
      where: { id: session.id },
      data: { status: 'ACTIVE' },
    });
  }

  return session;
}

// Obtiene el historial de mensajes de la sesión
export async function getSessionMessages(sessionId: string) {
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

// Añade un mensaje al historial
export async function addMessageToSession(sessionId: string, role: 'user' | 'assistant' | 'system', content: string) {
  return prisma.message.create({
    data: {
      sessionId,
      role,
      content,
    },
  });
}
