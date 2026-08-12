import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    const { message, isInternalNote, type, role } = body;

    if (!message) {
      return NextResponse.json({ error: 'El contenido del mensaje es obligatorio' }, { status: 400 });
    }

    // Verificar propiedad del tenant sobre la sesión
    const session = await prisma.session.findFirst({
      where: { 
        id, 
        commerceId: payload.commerceId as string 
      },
      include: { channelConnection: true }
    });

    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada o no autorizada' }, { status: 404 });
    }

    const messageRole = isInternalNote ? 'internal_note' : (role || 'assistant');
    const messageType = type || (isInternalNote ? 'NOTE' : 'TEXT');

    if (messageRole !== 'internal_note') {
      if (session.channelConnection?.provider === 'META' && session.channelConnection.channelPhoneId) {
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

      // Si el humano envía un mensaje, la sesión pasa automáticamente a HUMAN_ACTIVE
      await prisma.session.update({
        where: { id },
        data: {
          status: 'HUMAN_ACTIVE',
          controlBy: 'HUMAN',
          waitingSince: null
        }
      });
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
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
