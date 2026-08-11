import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    const { action, instruction, userId } = body; 
    // Actions: 'take_control', 'return_ai', 'resolve', 'resolve_and_return_ai'

    if (!['take_control', 'return_ai', 'resolve', 'resolve_and_return_ai', 'close_session'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    let updateData: any = {};

    if (action === 'take_control') {
      updateData = {
        status: 'HUMAN_ACTIVE',
        controlBy: 'HUMAN',
        waitingSince: null,
        assignedUserId: userId || null
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
