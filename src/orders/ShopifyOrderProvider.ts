import { IOrderProvider, CreateOrderParams, OrderResult } from './OrderProvider';
import { prisma } from '../db/prisma';
import { decrypt } from '../utils/crypto';
import axios from 'axios';

export class ShopifyOrderProvider implements IOrderProvider {
  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const { commerceId, sessionId, customerName, customerPhone, deliveryType, deliveryAddress, pickupTime, items, notes } = params;

    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId }
    });

    const meta = (commerce?.providerMetadata as any) || {};
    const shopifyShopUrl = meta.shopifyShopUrl || meta.shopifyStoreDomain;
    const shopifyAccessToken = meta.shopifyAccessToken ? decrypt(meta.shopifyAccessToken) : null;

    let externalOrderId: string | null = null;
    let syncError: string | null = null;

    if (shopifyShopUrl && shopifyAccessToken) {
      try {
        const cleanShop = shopifyShopUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
        const url = `https://${cleanShop}/admin/api/2024-01/orders.json`;

        const lineItems = items.map(item => ({
          title: item.name,
          quantity: item.quantity || 1,
          price: item.price ? item.price.toFixed(2) : "0.00"
        }));

        const response = await axios.post(url, {
          order: {
            phone: customerPhone,
            note: `Pedido WhatsApp IA. Recogida/Entrega: ${pickupTime || 'No especificado'}. Notas: ${notes || ''}`,
            line_items: lineItems,
            financial_status: "pending"
          }
        }, {
          headers: {
            'X-Shopify-Access-Token': shopifyAccessToken,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data && response.data.order) {
          externalOrderId = `#${response.data.order.order_number || response.data.order.id}`;
        }
      } catch (err: any) {
        console.error('[ShopifyOrderProvider] Error al enviar pedido a Shopify:', err.message);
        syncError = err.message;
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    const order = await prisma.order.create({
      data: {
        commerceId,
        sessionId: sessionId || null,
        source: 'SHOPIFY',
        externalOrderId: externalOrderId || null,
        status: externalOrderId ? 'CONFIRMED' : 'PENDING',
        customerName: customerName || 'Cliente WhatsApp',
        customerPhone,
        deliveryType,
        deliveryAddress: deliveryAddress || null,
        pickupTime: pickupTime || null,
        items: items as any,
        totalAmount: totalAmount > 0 ? totalAmount : null,
        notes: syncError ? `${notes || ''}\n[Aviso: No se pudo sincronizar automáticamente con Shopify: ${syncError}]` : notes || null
      }
    });

    const displayOrderNum = externalOrderId || `SH-${order.id.substring(0, 6).toUpperCase()}`;

    return {
      success: true,
      orderId: order.id,
      orderNumber: displayOrderNum,
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
      source: 'SHOPIFY',
      message: externalOrderId 
        ? `Pedido creado y sincronizado en Shopify con número ${externalOrderId}.`
        : `Pedido guardado localmente (${displayOrderNum}).`
    };
  }
}
