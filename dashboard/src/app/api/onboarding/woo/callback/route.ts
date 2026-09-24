import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { encrypt } from '../../../../../../../src/utils/crypto';
import { CatalogSyncService } from '../../../../../../../src/catalog/sync-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, consumer_key, consumer_secret } = body;

    if (!user_id || !consumer_key || !consumer_secret) {
      console.warn('[API /api/onboarding/woo/callback] Faltan parámetros requeridos en el payload:', body);
      return NextResponse.json({ error: 'Payload incompleto de WooCommerce' }, { status: 400 });
    }

    const commerce = await prisma.commerce.findUnique({
      where: { id: user_id },
      select: { id: true, providerMetadata: true }
    });

    if (!commerce) {
      console.error(`[API /api/onboarding/woo/callback] Comercio no encontrado para user_id: ${user_id}`);
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 });
    }

    const currentMeta = (commerce.providerMetadata && typeof commerce.providerMetadata === 'object')
      ? { ...(commerce.providerMetadata as Record<string, any>) }
      : {};

    const wooUrl = currentMeta.pendingWooUrl || currentMeta.wooUrl || '';
    delete currentMeta.pendingWooUrl;

    const encryptedKey = encrypt(consumer_key);
    const encryptedSecret = encrypt(consumer_secret);

    await prisma.commerce.update({
      where: { id: user_id },
      data: {
        providerMetadata: {
          ...currentMeta,
          wooUrl,
          wooConsumerKey: encryptedKey,
          wooConsumerSecret: encryptedSecret,
          wooConnectedAt: new Date().toISOString(),
          provider: 'woocommerce'
        }
      }
    });

    // Iniciar sincronización de catálogo en segundo plano de forma no bloqueante
    CatalogSyncService.syncCommerceCatalog(user_id).catch(err => {
      console.error('[WooCommerce Callback] Error sincronizando catálogo tras autorización:', err);
    });

    return NextResponse.json({ success: true, message: 'Tienda autorizada correctamente' }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/onboarding/woo/callback] Error procesando callback:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar la autorización' }, { status: 500 });
  }
}
