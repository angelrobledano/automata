import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();
    const { action, instruction } = body; // 'take_control', 'return_ai', or 'close_session'

    if (!['take_control', 'return_ai', 'close_session'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    let newStatus = 'ACTIVE';
    if (action === 'take_control') newStatus = 'HUMAN_CONTROL';
    if (action === 'close_session') newStatus = 'CLOSED';

    if (action === 'return_ai' && instruction) {
      await prisma.message.create({
        data: {
          sessionId: id,
          role: 'system',
          content: `Instrucción interna del operador: ${instruction}`
        }
      });
    }

    const session = await prisma.session.update({
      where: { id },
      data: { status: newStatus }
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('Error updating handoff status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
