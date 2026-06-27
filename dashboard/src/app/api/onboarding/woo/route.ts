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

    const { wooUrl, wooConsumerKey, wooConsumerSecret } = await request.json();

    if (!wooUrl || !wooConsumerKey || !wooConsumerSecret) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    // Ping a WooCommerce para validar
    const checkUrl = `${wooUrl.replace(/\/$/, '')}/wp-json/wc/v3/system_status`;
    const auth = Buffer.from(`${wooConsumerKey}:${wooConsumerSecret}`).toString('base64');
    
    try {
      const ping = await fetch(checkUrl, {
        headers: { 'Authorization': `Basic ${auth}` },
        signal: AbortSignal.timeout(10000)
      });
      if (!ping.ok) {
        return NextResponse.json({ error: 'Las credenciales de WooCommerce son incorrectas o la tienda no responde' }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: 'No se pudo contactar con la tienda WooCommerce' }, { status: 400 });
    }

    // Cifrar
    const encryptedKey = encrypt(wooConsumerKey);
    const encryptedSecret = encrypt(wooConsumerSecret);

    // await prisma.commerce.update({
    //   where: { id: payload.commerceId as string },
    //   data: {
    //     wooUrl,
    //     wooConsumerKey: encryptedKey,
    //     wooConsumerSecret: encryptedSecret
    //   }
    // });

    return NextResponse.json({ success: true, redirect: '/onboarding/meta' });
  } catch (error: any) {
    console.error('Error en onboarding Woo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
