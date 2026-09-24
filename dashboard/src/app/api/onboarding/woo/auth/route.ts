import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }

    const { wooUrl, returnContext } = await request.json();

    if (!wooUrl || typeof wooUrl !== 'string') {
      return NextResponse.json({ error: 'Debes proporcionar la dirección web de tu tienda' }, { status: 400 });
    }

    let cleanUrl = wooUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    try {
      new URL(cleanUrl);
    } catch {
      return NextResponse.json({ error: 'La dirección URL introducida no es válida' }, { status: 400 });
    }

    const currentCommerce = await prisma.commerce.findUnique({
      where: { id: payload.commerceId as string },
      select: { providerMetadata: true }
    });

    const currentMeta = (currentCommerce?.providerMetadata && typeof currentCommerce.providerMetadata === 'object')
      ? (currentCommerce.providerMetadata as Record<string, any>)
      : {};

    // Guardar la URL pendiente para asociarla en el callback del webhook
    await prisma.commerce.update({
      where: { id: payload.commerceId as string },
      data: {
        providerMetadata: {
          ...currentMeta,
          pendingWooUrl: cleanUrl
        }
      }
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const returnUrl = returnContext === 'settings'
      ? `${origin}/ajustes?tab=tienda&woo_connected=1`
      : `${origin}/onboarding/woo/return`;

    const callbackUrl = `${origin}/api/onboarding/woo/callback`;

    const authParams = new URLSearchParams({
      app_name: 'Automata',
      scope: 'read_write',
      user_id: payload.commerceId as string,
      return_url: returnUrl,
      callback_url: callbackUrl
    });

    const authUrl = `${cleanUrl}/wc-auth/v1/authorize?${authParams.toString()}`;

    return NextResponse.json({
      success: true,
      authUrl
    });
  } catch (error: any) {
    console.error('[API /api/onboarding/woo/auth] Error:', error);
    return NextResponse.json({ error: 'Error interno al generar enlace de autorización' }, { status: 500 });
  }
}
