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
    if (!payload || (payload.role !== 'SUPERADMIN' && payload.role !== 'SUPPORT')) {
      return NextResponse.json({ error: 'Prohibido: Requiere rol de administración' }, { status: 403 });
    }

    if (payload.isImpersonating) {
      return NextResponse.json({ error: 'Acción no permitida durante la impersonación' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';
    const planFilter = searchParams.get('plan') || 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } },
        { users: { some: { email: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    if (status !== 'ALL') {
      where.status = status;
    }

    if (planFilter === 'VIP') {
      where.isLifetimeFree = true;
    } else if (planFilter === 'PAID') {
      where.isLifetimeFree = false;
      where.subscriptionStatus = 'ACTIVE';
    } else if (planFilter === 'INACTIVE') {
      where.subscriptionStatus = { in: ['INACTIVE', 'CANCELED', 'PAST_DUE'] };
    }

    const [total, commerces] = await Promise.all([
      prisma.commerce.count({ where }),
      prisma.commerce.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { sessions: true, users: true, knowledgeSources: true }
          },
          users: {
            select: { id: true, email: true, role: true, status: true, lastLoginAt: true }
          },
          channelConnections: {
            select: { provider: true, status: true }
          },
          subscriptions: {
            include: { plan: true },
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          sessions: {
            take: 1,
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formattedCommerces = commerces.map(c => {
      const activeSubscription = c.subscriptions[0];
      const planName = c.isLifetimeFree 
        ? 'VIP Ilimitado' 
        : (activeSubscription?.plan?.name || c.subscriptionStatus || 'Prueba / Gratuito');

      const lastActivity = c.sessions[0]?.updatedAt || c.createdAt;

      return {
        id: c.id,
        name: c.name,
        address: c.address,
        createdAt: c.createdAt,
        status: c.status || 'ACTIVE',
        subscriptionStatus: c.subscriptionStatus,
        isLifetimeFree: c.isLifetimeFree,
        planName,
        onboardingCompleted: c.onboardingCompleted,
        usersCount: c._count.users,
        sessionsCount: c._count.sessions,
        knowledgeCount: c._count.knowledgeSources,
        lastActivity,
        waConnected: c.channelConnections.some((conn: any) => conn.provider === 'META' && conn.status === 'CONNECTED'),
        users: c.users
      };
    });

    return NextResponse.json({
      success: true,
      commerces: formattedCommerces,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error admin commerces GET:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Prohibido: Requiere rol SUPERADMIN' }, { status: 403 });
    }

    if (payload.isImpersonating) {
      return NextResponse.json({ error: 'Acción no permitida durante la impersonación' }, { status: 403 });
    }

    const { name, email, password, isLifetimeFree, status } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const commerce = await prisma.commerce.create({
      data: {
        name,
        systemPrompt: `Eres el asistente virtual de ${name}. Atiendes dudas de clientes de forma educada y concisa.`,
        isLifetimeFree: !!isLifetimeFree,
        status: status || 'ACTIVE',
        subscriptionStatus: isLifetimeFree ? 'ACTIVE' : 'INACTIVE',
        users: {
          create: {
            email,
            password: hashedPassword,
            role: 'OWNER',
            status: 'ACTIVE'
          }
        }
      }
    });

    // Registrar auditoría
    await prisma.auditLog.create({
      data: {
        commerceId: commerce.id,
        userId: payload.userId as string,
        action: 'CREATE_COMMERCE',
        targetId: commerce.id,
        details: `El administrador ${payload.email} creó la empresa ${name} (${email})`,
        metadata: {
          adminEmail: String(payload.email || ''),
          isLifetimeFree: !!isLifetimeFree
        } as any
      }
    });

    return NextResponse.json({ success: true, commerce });
  } catch (error: any) {
    console.error('Error creating commerce:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
