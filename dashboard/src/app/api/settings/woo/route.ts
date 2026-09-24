import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentCommerce = await prisma.commerce.findUnique({
      where: { id: payload.commerceId as string },
      select: { providerMetadata: true }
    });

    const currentMeta = (currentCommerce?.providerMetadata && typeof currentCommerce.providerMetadata === 'object')
      ? { ...(currentCommerce.providerMetadata as Record<string, any>) }
      : {};

    delete currentMeta.wooUrl;
    delete currentMeta.wooConsumerKey;
    delete currentMeta.wooConsumerSecret;
    delete currentMeta.wooConnectedAt;
    if (currentMeta.provider === 'woocommerce') {
      currentMeta.provider = currentMeta.shopifyStoreDomain ? 'shopify' : 'local';
    }

    await prisma.commerce.update({
      where: { id: payload.commerceId as string },
      data: { providerMetadata: currentMeta }
    });

    return NextResponse.json({ success: true, message: 'WooCommerce desconectado correctamente' });
  } catch (error: any) {
    console.error('[API /api/settings/woo] Error al desconectar:', error);
    return NextResponse.json({ error: 'Error interno al desconectar' }, { status: 500 });
  }
}
