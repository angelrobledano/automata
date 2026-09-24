import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { CatalogSyncService } from '../../../../../../../src/catalog/sync-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.commerceId) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const syncResult = await CatalogSyncService.syncCommerceCatalog(payload.commerceId as string);

    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      provider: syncResult.provider,
      productsCount: syncResult.productsCount,
      message: syncResult.message
    });
  } catch (error: any) {
    console.error('[API /api/settings/catalog/sync] Error sincronizando catálogo:', error);
    return NextResponse.json({ error: 'Error interno al sincronizar el catálogo' }, { status: 500 });
  }
}
