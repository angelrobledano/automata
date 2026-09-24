import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/db/prisma';
import { encrypt } from '../../../../../../src/utils/crypto';
import { verifyToken } from '../../../../lib/jwt';
import { cookies } from 'next/headers';
import axios from 'axios';

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

    const { shopUrl, accessToken } = await request.json();

    if (!shopUrl || !accessToken) {
      return NextResponse.json({ error: 'Faltan campos obligatorios (URL de la tienda y Access Token)' }, { status: 400 });
    }

    const cleanShop = shopUrl
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();

    // Validar conexión contra la API oficial de Shopify
    const pingUrl = `https://${cleanShop}/admin/api/2024-01/shop.json`;
    let shopName = cleanShop;

    try {
      const pingRes = await axios.get(pingUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken.trim(),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (pingRes.data?.shop?.name) {
        shopName = pingRes.data.shop.name;
      }
    } catch (apiErr: any) {
      console.error('[API /api/settings/shopify] Error validando con Shopify:', apiErr.response?.data || apiErr.message);
      return NextResponse.json({
        error: 'No se pudo verificar la tienda con Shopify. Revisa que el dominio (.myshopify.com) y el Access Token sean válidos y tengan permisos.'
      }, { status: 400 });
    }

    const encryptedToken = encrypt(accessToken.trim());

    const currentCommerce = await prisma.commerce.findUnique({
      where: { id: payload.commerceId as string },
      select: { providerMetadata: true }
    });

    const currentMeta = (currentCommerce?.providerMetadata && typeof currentCommerce.providerMetadata === 'object')
      ? (currentCommerce.providerMetadata as Record<string, any>)
      : {};

    await prisma.commerce.update({
      where: { id: payload.commerceId as string },
      data: {
        providerMetadata: {
          ...currentMeta,
          shopifyShopUrl: cleanShop,
          shopifyStoreDomain: cleanShop,
          shopifyAccessToken: encryptedToken,
          shopifyConnectedAt: new Date().toISOString(),
          provider: 'shopify'
        }
      }
    });

    return NextResponse.json({
      success: true,
      shop: {
        name: shopName,
        domain: cleanShop
      }
    });
  } catch (error: any) {
    console.error('[API /api/settings/shopify] Error interno:', error);
    return NextResponse.json({ error: 'Error interno al conectar Shopify' }, { status: 500 });
  }
}

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

    delete currentMeta.shopifyShopUrl;
    delete currentMeta.shopifyStoreDomain;
    delete currentMeta.shopifyAccessToken;
    delete currentMeta.shopifyConnectedAt;
    if (currentMeta.provider === 'shopify') {
      currentMeta.provider = currentMeta.wooUrl ? 'woocommerce' : 'local';
    }

    await prisma.commerce.update({
      where: { id: payload.commerceId as string },
      data: { providerMetadata: currentMeta }
    });

    return NextResponse.json({ success: true, message: 'Shopify desconectado correctamente' });
  } catch (error: any) {
    console.error('[API /api/settings/shopify] Error al desconectar:', error);
    return NextResponse.json({ error: 'Error interno al desconectar' }, { status: 500 });
  }
}
