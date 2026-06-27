import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/db/prisma';
import { verifyToken } from '../../../lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'OWNER') {
       return NextResponse.json({ error: 'No tienes permisos para invitar equipo' }, { status: 403 });
    }

    const { email, role, password } = await request.json();

    if (!email || !role || !password) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
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
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
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
