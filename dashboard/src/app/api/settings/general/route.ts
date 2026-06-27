import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { name, address, businessHours, systemPrompt } = body;

    const updated = await prisma.commerce.update({
      where: { id: payload.commerceId as string },
      data: {
        name,
        address,
        businessHours,
        systemPrompt
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating general settings:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
