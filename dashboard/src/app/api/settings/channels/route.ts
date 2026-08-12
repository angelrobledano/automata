import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import { encrypt } from '../../../../../../src/utils/crypto';

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (payload.role === 'AGENT') {
      return NextResponse.json({ error: 'No tienes permisos para modificar la configuración' }, { status: 403 });
    }

    const body = await request.json();
    const { waPhoneNumberId, waToken, wooUrl, wooConsumerKey, wooConsumerSecret } = body;

    const updateData: any = {};

    if (waPhoneNumberId && waToken) {
      const checkUrl = `https://graph.facebook.com/v19.0/${waPhoneNumberId}`;
      const ping = await fetch(checkUrl, {
        headers: { 'Authorization': `Bearer ${waToken}` },
        signal: AbortSignal.timeout(10000)
      }).catch(() => null);
      
      if (!ping || !ping.ok) {
        return NextResponse.json({ error: 'Las credenciales de WhatsApp son inválidas o caducadas.' }, { status: 400 });
      }
      updateData.waPhoneNumberId = waPhoneNumberId;
      updateData.waToken = encrypt(waToken);
    }

    if (wooUrl && wooConsumerKey && wooConsumerSecret) {
      if (!wooUrl.startsWith('https://')) {
        return NextResponse.json({ error: 'La URL de WooCommerce debe ser HTTPS' }, { status: 400 });
      }
      updateData.wooUrl = wooUrl;
      updateData.wooConsumerKey = wooConsumerKey;
      updateData.wooConsumerSecret = wooConsumerSecret;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.commerce.update({
        where: { id: payload.commerceId as string },
        data: updateData
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating channels:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (payload.role === 'AGENT') {
      return NextResponse.json({ error: 'No tienes permisos para modificar la configuración' }, { status: 403 });
    }

    const commerceId = payload.commerceId as string;
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider') || 'META';

    await prisma.channelConnection.deleteMany({
      where: { commerceId, provider: provider as any }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting channel connection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
