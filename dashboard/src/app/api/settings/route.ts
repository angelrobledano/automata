import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/db/prisma';
import { verifyToken } from '../../../lib/jwt';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const commerce = await prisma.commerce.findUnique({
      where: { id: payload.commerceId as string },
      include: {
        users: { select: { id: true, email: true, role: true } },
        channelConnections: true,
      }
    });

    if (!commerce) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    // Exponer la información pero ofuscando tokens sensibles
    return NextResponse.json({
      success: true,
      settings: {
        general: {
          name: commerce.name,
          address: commerce.address || '',
          businessHours: commerce.businessHours,
          systemPrompt: commerce.systemPrompt
        },
        channels: {
          metaConnected: commerce.channelConnections.some(c => c.provider === 'META' && c.status === 'CONNECTED'),
          connections: commerce.channelConnections.map(c => ({
            id: c.id,
            provider: c.provider,
            status: c.status,
            phoneId: c.channelPhoneId,
            accountId: c.channelAccountId,
            expiresAt: c.tokenExpiresAt
          }))
        },
        store: {
          wooConnected: Boolean((commerce.providerMetadata as any)?.wooUrl && (commerce.providerMetadata as any)?.wooConsumerKey),
          wooUrl: (commerce.providerMetadata as any)?.wooUrl || null,
          shopifyConnected: Boolean((commerce.providerMetadata as any)?.shopifyStoreDomain && (commerce.providerMetadata as any)?.shopifyAccessToken),
          shopifyStoreDomain: (commerce.providerMetadata as any)?.shopifyStoreDomain || null,
          provider: (commerce.providerMetadata as any)?.provider || ((commerce.providerMetadata as any)?.shopifyStoreDomain ? 'shopify' : (commerce.providerMetadata as any)?.wooUrl ? 'woocommerce' : 'local')
        },
        subscription: {
          status: commerce.subscriptionStatus,
          isLifetimeFree: commerce.isLifetimeFree
        },
        team: commerce.users
      }
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
