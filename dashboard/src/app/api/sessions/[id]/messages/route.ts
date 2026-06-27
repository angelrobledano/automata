import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    const { message, isInternalNote, type, role } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const messageRole = isInternalNote ? 'internal_note' : (role || 'assistant');
    const messageType = type || (isInternalNote ? 'NOTE' : 'TEXT');

    if (messageRole !== 'internal_note') {
      const session = await prisma.session.findUnique({
        where: { id },
        include: { channelConnection: true }
      });

      if (session && session.channelConnection?.provider === 'META' && session.channelConnection.channelPhoneId) {
        // Need to decrypt the token in a real scenario, assuming decrypt is available or skipping for now
        // For simplicity, we just check if it has accessToken
        const waToken = process.env.WHATSAPP_TOKEN || session.channelConnection.accessToken || '';
        if (waToken) {
          const { WhatsAppService } = await import('../../../../../services/whatsapp.service');
          await WhatsAppService.sendTextMessage(
            session.channelConnection.channelPhoneId,
            session.customerIdentifier,
            message,
            waToken
          );
        } else {
          console.log(`[WhatsApp API Mock] Token faltante para enviar a ${id}: "${message}"`);
        }
      } else {
        console.log(`[WhatsApp API Mock] Enviando mensaje a sesión ${id}: "${message}"`);
      }
    }

    // Persistir el mensaje en la base de datos
    const dbMessage = await prisma.message.create({
      data: {
        sessionId: id,
        role: messageRole,
        type: messageType,
        content: message
      }
    });

    return NextResponse.json({ success: true, message: dbMessage });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
