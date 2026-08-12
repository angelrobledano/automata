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
    const { action, instruction, userId } = body; 
    // Actions: 'take_control', 'return_ai', 'resolve', 'resolve_and_return_ai', 'close_session'

    if (!['take_control', 'return_ai', 'resolve', 'resolve_and_return_ai', 'close_session'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    // Verificar pertenencia al tenant antes de actualizar
    const existingSession = await prisma.session.findFirst({
      where: { id, commerceId: payload.commerceId as string }
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Sesión no encontrada o no autorizada' }, { status: 404 });
    }

    let updateData: any = {};

    if (action === 'take_control') {
      updateData = {
        status: 'HUMAN_ACTIVE',
        controlBy: 'HUMAN',
        waitingSince: null,
        assignedUserId: userId || payload.userId || null
      };
    } else if (action === 'return_ai') {
      updateData = {
        status: 'AI_ACTIVE',
        controlBy: 'AI',
        humanReason: null,
        aiSummary: null,
        suggestedReply: null,
        waitingSince: null
      };

      if (instruction) {
        await prisma.message.create({
          data: {
            sessionId: id,
            role: 'system',
            content: `Instrucción del operador a la IA: ${instruction}`
          }
        });
      }
    } else if (action === 'resolve') {
      updateData = {
        status: 'RESOLVED',
        waitingSince: null
      };
    } else if (action === 'resolve_and_return_ai') {
      updateData = {
        status: 'RESOLVED',
        controlBy: 'AI',
        humanReason: null,
        aiSummary: null,
        suggestedReply: null,
        waitingSince: null
      };
    } else if (action === 'close_session') {
      updateData = {
        status: 'RESOLVED',
        controlBy: 'AI',
        waitingSince: null
      };
    }

    const session = await prisma.session.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('Error updating handoff status:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
