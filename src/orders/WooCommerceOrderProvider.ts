import { IOrderProvider, CreateOrderParams, OrderResult } from './OrderProvider';
import { prisma } from '../db/prisma';
import { decrypt } from '../utils/crypto';
import axios from 'axios';

export class WooCommerceOrderProvider implements IOrderProvider {
  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const { commerceId, sessionId, customerName, customerPhone, deliveryType, deliveryAddress, pickupTime, items, notes } = params;

    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId }
    });

    const meta = (commerce?.providerMetadata as any) || {};
    const wooUrl = meta.wooUrl;
    const wooConsumerKey = meta.wooConsumerKey ? decrypt(meta.wooConsumerKey) : null;
    const wooConsumerSecret = meta.wooConsumerSecret ? decrypt(meta.wooConsumerSecret) : null;

    let externalOrderId: string | null = null;
    let syncError: string | null = null;

    if (wooUrl && wooConsumerKey && wooConsumerSecret) {
      try {
        const url = `${wooUrl.replace(/\/$/, '')}/wp-json/wc/v3/orders`;
        const auth = Buffer.from(`${wooConsumerKey}:${wooConsumerSecret}`).toString('base64');

        const lineItems = items.map(item => ({
          name: item.name,
          quantity: item.quantity || 1,
          total: item.price ? (item.price * (item.quantity || 1)).toFixed(2) : "0.00"
        }));

        const customerNote = [
          `--- PEDIDO WHATSAPP IA ---`,
          `Artículos: ${items.map(i => `${i.quantity}x ${i.name}${i.notes ? ` (${i.notes})` : ''}`).join(', ')}`,
          `Tipo de entrega: ${deliveryType === 'PICKUP' ? 'Recogida en tienda' : 'Envío a domicilio'}`,
          pickupTime ? `Hora prevista: ${pickupTime}` : null,
          deliveryAddress ? `Dirección: ${deliveryAddress}` : null,
          notes ? `Notas extra: ${notes}` : null,
        ].filter(Boolean).join('\n');

        const response = await axios.post(url, {
          payment_method: "bacs",
          payment_method_title: "Pago en Tienda / Contra Entrega (WhatsApp IA)",
          set_paid: false,
          billing: {
            first_name: customerName || 'Cliente WhatsApp',
            phone: customerPhone,
            address_1: deliveryAddress || ''
          },
          shipping: {
            first_name: customerName || 'Cliente WhatsApp',
            address_1: deliveryAddress || ''
          },
          customer_note: customerNote,
          line_items: lineItems.length > 0 ? lineItems : [{ name: 'Pedido WhatsApp', quantity: 1, total: "0.00" }]
        }, {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data && response.data.id) {
          externalOrderId = `#${response.data.id}`;
        }
      } catch (err: any) {
        console.error('[WooCommerceOrderProvider] Error al enviar pedido a WooCommerce:', err.message);
        syncError = err.message;
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    const order = await prisma.order.create({
      data: {
        commerceId,
        sessionId: sessionId || null,
        source: 'WOOCOMMERCE',
        externalOrderId: externalOrderId || null,
        status: externalOrderId ? 'CONFIRMED' : 'PENDING',
        customerName: customerName || 'Cliente WhatsApp',
        customerPhone,
        deliveryType,
        deliveryAddress: deliveryAddress || null,
        pickupTime: pickupTime || null,
        items: items as any,
        totalAmount: totalAmount > 0 ? totalAmount : null,
        notes: syncError ? `${notes || ''}\n[Aviso: No se pudo sincronizar automáticamente con WooCommerce: ${syncError}]` : notes || null
      }
    });

    const displayOrderNum = externalOrderId || `WC-${order.id.substring(0, 6).toUpperCase()}`;

    return {
      success: true,
      orderId: order.id,
      orderNumber: displayOrderNum,
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
      source: 'WOOCOMMERCE',
      message: externalOrderId 
        ? `Pedido creado y sincronizado en WooCommerce con número ${externalOrderId}.`
        : `Pedido guardado localmente (${displayOrderNum}).`
    };
  }
}
