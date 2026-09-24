import { prisma } from '../db/prisma';
import { decrypt, encrypt } from '../utils/crypto';
import { CatalogSyncService } from '../catalog/sync-service';

/**
 * B-22: sincroniza el catálogo de TODOS los comercios con tienda conectada.
 * Programado diariamente (BullMQ repeatable) — antes solo existía sync manual
 * y el catálogo del RAG quedaba desfasado indefinidamente.
 */
export async function syncAllCommerces(): Promise<{ synced: number; failed: number; skipped: number }> {
  const commerces = await prisma.commerce.findMany({
    select: { id: true, providerMetadata: true }
  });

  let synced = 0, failed = 0, skipped = 0;

  for (const commerce of commerces) {
    const meta = (commerce.providerMetadata as any) || {};
    const hasWoo = Boolean(meta.wooUrl && meta.wooConsumerKey && meta.wooConsumerSecret);
    const hasShopify = Boolean((meta.shopifyStoreDomain || meta.shopifyShopUrl) && meta.shopifyAccessToken);

    if (!hasWoo && !hasShopify) {
      skipped++;
      continue;
    }

    try {
      const result = await CatalogSyncService.syncCommerceCatalog(commerce.id);
      if (result.success) synced++;
      else failed++;
    } catch (err: any) {
      console.error(`[Maintenance] Error sincronizando catálogo de ${commerce.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[Maintenance] Sync de catálogo: ${synced} OK, ${failed} fallos, ${skipped} sin tienda.`);
  return { synced, failed, skipped };
}

/**
 * B-17: los tokens de usuario de Meta (WhatsApp Cloud) caducan a ~60 días.
 * Antes no había refresh: TODOS los WhatsApp morían en silencio ~60 días
 * tras conectar. Renueva los que expiren en menos de 30 días vía
 * fb_exchange_token (el long-lived token puede extenderse llamando de nuevo
 * al endpoint mientras sea válido).
 */
export async function refreshExpiringMetaTokens(): Promise<{ refreshed: number; failed: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    console.warn('[MetaTokenRefresh] META_APP_ID/META_APP_SECRET no configurados: no se puede refrescar.');
    return { refreshed: 0, failed: 0 };
  }

  const threshold = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const connections = await prisma.channelConnection.findMany({
    where: { provider: 'META', status: 'CONNECTED', tokenExpiresAt: { lte: threshold } }
  });

  let refreshed = 0, failed = 0;

  for (const conn of connections) {
    try {
      if (!conn.accessToken) { failed++; continue; }
      const currentToken = decrypt(conn.accessToken);

      const url = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(currentToken)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.access_token) {
        const expiresIn = Number(data.expires_in) || 60 * 24 * 60 * 60; // 60 días por defecto
        await prisma.channelConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: encrypt(data.access_token),
            tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            lastValidatedAt: new Date(),
            status: 'CONNECTED',
            lastErrorReason: null,
          }
        });
        refreshed++;
        console.log(`[MetaTokenRefresh] Token renovado para conexión ${conn.id} (commerce ${conn.commerceId}).`);
      } else {
        failed++;
        console.error(`[MetaTokenRefresh] Fallo renovando ${conn.id}:`, JSON.stringify(data.error || data).slice(0, 200));
        await prisma.channelConnection.update({
          where: { id: conn.id },
          data: { status: 'RECONNECT_REQUIRED', lastErrorReason: 'No se pudo renovar el token; el merchant debe reconectar WhatsApp.' }
        }).catch(() => {});
      }
    } catch (err: any) {
      failed++;
      console.error(`[MetaTokenRefresh] Error con conexión ${conn.id}:`, err.message);
    }
  }

  console.log(`[MetaTokenRefresh] Tokens renovados: ${refreshed}, fallos: ${failed}.`);
  return { refreshed, failed };
}
