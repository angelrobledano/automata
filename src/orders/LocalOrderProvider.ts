import { IOrderProvider, CreateOrderParams, OrderResult } from './OrderProvider';
import { prisma } from '../db/prisma';

export class LocalOrderProvider implements IOrderProvider {
  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const { commerceId, sessionId, customerName, customerPhone, deliveryType, deliveryAddress, pickupTime, items, notes } = params;

    // Calcular importe total si los items tienen precio
    const totalAmount = items.reduce((sum, item) => {
      const price = item.price || 0;
      return sum + price * (item.quantity || 1);
    }, 0);

    const order = await prisma.order.create({
      data: {
        commerceId,
        sessionId: sessionId || null,
        source: 'MANUAL',
        status: 'PENDING',
        customerName: customerName || 'Cliente WhatsApp',
        customerPhone,
        deliveryType,
        deliveryAddress: deliveryAddress || null,
        pickupTime: pickupTime || null,
        items: items as any,
        totalAmount: totalAmount > 0 ? totalAmount : null,
        notes: notes || null,
      }
    });

    const shortId = order.id.substring(0, 6).toUpperCase();
    const orderNumber = `ENC-${shortId}`;

    return {
      success: true,
      orderId: order.id,
      orderNumber,
      totalAmount: totalAmount > 0 ? totalAmount : undefined,
      source: 'MANUAL',
      message: `Encargo registrado con éxito (${orderNumber}).`
    };
  }
}
