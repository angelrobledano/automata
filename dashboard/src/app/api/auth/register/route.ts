import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'El email ya está en uso' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Creamos Commerce y User a la vez
    const commerce = await prisma.commerce.create({
      data: {
        name,
        systemPrompt: `Eres el asistente virtual de ${name}. Ayudas a los clientes a resolver dudas y realizar pedidos.`,
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
