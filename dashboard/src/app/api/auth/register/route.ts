import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

const regIpAttempts = new Map<string, { count: number; resetAt: number }>();

function isRegisterRateLimited(ip: string, maxAttempts = 5, windowMs = 3600000): boolean {
  const now = Date.now();
  const entry = regIpAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    regIpAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= maxAttempts) {
    return true;
  }
  entry.count++;
  return false;
}

export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRegisterRateLimited(clientIp, 5, 3600000)) {
      return NextResponse.json({ error: 'Has alcanzado el límite de registros. Por favor espera antes de intentar de nuevo.' }, { status: 429 });
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El formato de correo electrónico no es válido' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está en uso' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Creamos Commerce (en trial activo de 14 días) y User a la vez
    const commerce = await prisma.commerce.create({
      data: {
        name,
        systemPrompt: `Eres el asistente virtual de ${name}. Ayudas a los clientes a resolver dudas y realizar pedidos.`,
        status: 'TRIAL',
        subscriptionStatus: 'ACTIVE',
        onboardingCompleted: false,
        users: {
          create: {
            email,
            password: hashedPassword
          }
        }
      },
      include: {
        users: true
      }
    });

    const user = commerce.users[0];

    // JWT
    const token = await signToken({ 
      userId: user.id, 
      commerceId: commerce.id, 
      email: user.email,
      role: user.role,
      isLifetimeFree: commerce.isLifetimeFree,
      subscriptionStatus: commerce.subscriptionStatus
    });
    
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({ success: true, redirect: '/onboarding/woo' });
  } catch (error: any) {
    console.error('Error in register:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
