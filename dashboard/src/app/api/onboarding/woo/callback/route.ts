import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../../src/db/prisma';
import { encrypt } from '../../../../../../../src/utils/crypto';
import { readCookieValue } from '../../../../../../../src/utils/jwt';
import { verifyToken } from '@/lib/jwt';
import { CatalogSyncService } from '../../../../../../../src/catalog/sync-service';

export const dynamic = 'force-dynamic';

/**
 * B-08: callback de la autorización 1-clic de WooCommerce.
 * Woo (wc-auth v1) redirige el navegador del merchant aquí con query params:
 * user_id, consumer_key, consumer_secret.
 *
 * ANTES: POST sin autenticación — cualquiera que conociera un commerceId podía
 * sobrescribir sus credenciales Woo. AHORA: GET + sesión obligatoria + el
 * user_id debe coincidir con el commerceId del JWT (la cookie del merchant que
 * autoriza es la prueba de legitimidad).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const consumerKey = url.searchParams.get('consumer_key');
    const consumerSecret = url.searchParams.get('consumer_secret');

    if (!userId || !consumerKey || !consumerSecret) {
      return NextResponse.redirect(new URL('/ajustes?tab=tienda&woo_error=missing_params', request.url));
    }

    // Autenticación obligatoria del navegador que completó la autorización
    const token = readCookieValue(request.headers.get('cookie'), 'token');
    const payload = token ? await verifyToken(token) : null;
    if (!payload?.commerceId) {
      return NextResponse.redirect(new URL('/ajustes?tab=tienda&woo_error=no_session', request.url));
    }

    // Ownership: el comercio autorizado debe ser el del JWT
    if (payload.commerceId !== userId) {
      console.error(`[Security] Woo callback: commerce del JWT (${payload.commerceId}) != user_id (${userId}). Rechazado.`);
      return NextResponse.redirect(new URL('/ajustes?tab=tienda&woo_error=ownership', request.url));
    }

    const commerce = await prisma.commerce.findUnique({
      where: { id: userId },
      select: { id: true, providerMetadata: true }
    });

    if (!commerce) {
      return NextResponse.redirect(new URL('/ajustes?tab=tienda&woo_error=no_commerce', request.url));
    }

    const currentMeta = (commerce.providerMetadata && typeof commerce.providerMetadata === 'object')
      ? { ...(commerce.providerMetadata as Record<string, any>) }
      : {};

    const wooUrl = currentMeta.pendingWooUrl || currentMeta.wooUrl || '';
    delete currentMeta.pendingWooUrl;

    const encryptedKey = encrypt(consumerKey);
    const encryptedSecret = encrypt(consumerSecret);

    await prisma.commerce.update({
      where: { id: userId },
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
    CatalogSyncService.syncCommerceCatalog(userId).catch(err => {
      console.error('[WooCommerce Callback] Error sincronizando catálogo tras autorización:', err);
    });

    return NextResponse.redirect(new URL('/ajustes?tab=tienda&woo_connected=1', request.url));
  } catch (error: any) {
    console.error('[API /api/onboarding/woo/callback] Error procesando callback:', error);
    return NextResponse.redirect(new URL('/ajustes?tab=tienda&woo_error=server', request.url));
  }
}
