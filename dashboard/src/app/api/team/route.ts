import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/db/prisma';
import { verifyToken } from '../../../lib/jwt';
import { readCookieValue } from '../../../../../src/utils/jwt';
import bcrypt from 'bcryptjs';

// B-07: un OWNER solo puede invitar roles de negocio. Permitir SUPERADMIN/SUPPORT
// desde aquí era una escalada de privilegios OWNER -> SUPERADMIN.
const ASSIGNABLE_ROLES = ['AGENT', 'OWNER'];

export async function POST(request: Request) {
  try {
    const token = readCookieValue(request.headers.get('cookie'), 'token');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'OWNER') {
       return NextResponse.json({ error: 'No tienes permisos para invitar equipo' }, { status: 403 });
    }

    const { email, role, password } = await request.json();

    if (!email || !role || !password) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol no permitido' }, { status: 403 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        role,
        password: hashedPassword,
        commerceId: payload.commerceId as string
      },
      select: { id: true, email: true, role: true }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = readCookieValue(request.headers.get('cookie'), 'token');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'OWNER') {
       return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    if (userId === payload.id) {
       return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId, commerceId: payload.commerceId as string }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
