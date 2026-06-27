import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { encrypt } from '../../../../../../src/utils/crypto';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { waPhoneNumberId, waToken, skip } = await request.json();

    if (skip) {
      await prisma.commerce.update({
        where: { id: payload.commerceId as string },
        data: { onboardingCompleted: true }
      });
      return NextResponse.json({ success: true, redirect: '/dashboard' });
    }

    if (!waPhoneNumberId || !waToken) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    // Ping a Meta Graph API para validar
    const checkUrl = `https://graph.facebook.com/v19.0/${waPhoneNumberId}`;
    
    try {
      const ping = await fetch(checkUrl, {
        headers: { 'Authorization': `Bearer ${waToken}` },
        signal: AbortSignal.timeout(10000)
      });
      if (!ping.ok) {
        return NextResponse.json({ error: 'Las credenciales de Meta son incorrectas o no tienen permisos' }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'No se pudo contactar con Meta API' }, { status: 400 });
    }

    const encryptedToken = encrypt(waToken);

    await prisma.$transaction([
      prisma.channelConnection.create({
        data: {
          commerceId: payload.commerceId as string,
          provider: 'META',
          status: 'CONNECTED',
          accessToken: encryptedToken,
          channelPhoneId: waPhoneNumberId
        }
      }),
      prisma.commerce.update({
        where: { id: payload.commerceId as string },
        data: {
          onboardingCompleted: true // ¡Onboarding finalizado!
        }
      })
    ]);

    return NextResponse.json({ success: true, redirect: '/dashboard' });
  } catch (error: any) {
    console.error('Error en onboarding Meta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
