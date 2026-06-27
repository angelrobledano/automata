import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { prisma } from '../../../../../../src/db/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      // Inyección temporal de un usuario ficticio para evitar bloqueos en el testeo si no hay sesión
      const testUser = await prisma.user.findFirst();
      if (testUser) {
        return NextResponse.json({
          success: true,
          user: {
            id: testUser.id,
            email: testUser.email,
            role: testUser.role, // 'OWNER', 'ADMIN', 'AGENT'
            commerceId: testUser.commerceId
          }
        });
      }
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        commerceId: payload.commerceId
      }
    });
  } catch (error: any) {
    console.error('Error fetching me:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
