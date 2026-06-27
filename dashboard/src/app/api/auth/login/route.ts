import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import bcrypt from 'bcrypt';
import { signToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { commerce: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // JWT
    const token = await signToken({ 
      userId: user.id, 
      commerceId: user.commerceId, 
      email: user.email,
      role: user.role,
      isLifetimeFree: user.commerce.isLifetimeFree,
      subscriptionStatus: user.commerce.subscriptionStatus
    });
    
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    // Check where to redirect
    let redirect = '/dashboard';
    if (user.role === 'SUPERADMIN') redirect = '/backoffice';
    else if (!user.commerce.onboardingCompleted) redirect = '/onboarding/woo';

    return NextResponse.json({ success: true, redirect });
  } catch (error: any) {
    console.error('Error in login:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor', stack: error.stack }, { status: 500 });
  }
}
