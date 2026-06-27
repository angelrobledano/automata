import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    // Listado de comercios con sus métricas básicas
    const commerces = await prisma.commerce.findMany({
      include: {
        _count: {
          select: { sessions: true }
        },
        channelConnections: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCommerces = commerces.map(c => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      onboardingCompleted: c.onboardingCompleted,
      sessionsCount: c._count.sessions,
      waConnected: c.channelConnections.some((conn: any) => conn.provider === 'META' && conn.status === 'CONNECTED'),
      wooConnected: false,
      isLifetimeFree: c.isLifetimeFree
    }));

    return NextResponse.json({
      success: true,
      commerces: formattedCommerces
    });
  } catch (error: any) {
    console.error('Error admin commerces:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    const { name, email, password, isLifetimeFree } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya existe' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const commerce = await prisma.commerce.create({
      data: {
        name,
        systemPrompt: `Eres el asistente virtual de ${name}.`,
        isLifetimeFree: !!isLifetimeFree,
        users: {
          create: {
            email,
            password: hashedPassword
          }
        }
      }
    });

    // Auditoría
    await prisma.auditLog.create({
      data: {
        commerceId: commerce.id,
        userId: payload.userId as string,
        action: 'CREATE_COMMERCE',
        targetId: commerce.id,
        details: 'Admin created new commerce'
      }
    });

    return NextResponse.json({ success: true, commerce });
  } catch (error: any) {
    console.error('Error creating commerce:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
