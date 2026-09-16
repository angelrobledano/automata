import { CreateOrderParams, OrderResult, IOrderProvider } from './OrderProvider';
import { LocalOrderProvider } from './LocalOrderProvider';
import { WooCommerceOrderProvider } from './WooCommerceOrderProvider';
import { ShopifyOrderProvider } from './ShopifyOrderProvider';
import { prisma } from '../db/prisma';
import { getBusinessStatus } from '../utils/businessHours';
import IORedis from 'ioredis';

let redisPub: IORedis | null = null;
function getRedisPub(): IORedis {
  if (!redisPub) {
    redisPub = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true
    });
  }
  return redisPub;
}
export class OrderService {
  private static localProvider = new LocalOrderProvider();
  private static wooProvider = new WooCommerceOrderProvider();
  private static shopifyProvider = new ShopifyOrderProvider();

  static async getProviderForCommerce(commerceId: string): Promise<IOrderProvider> {
    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId }
    });

    const meta = (commerce?.providerMetadata as any) || {};

    if (meta.wooUrl && meta.wooConsumerKey) {
      return this.wooProvider;
    }

    if (meta.shopifyShopUrl && meta.shopifyAccessToken) {
      return this.shopifyProvider;
    }

    return this.localProvider;
  }

  static async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const commerce = await prisma.commerce.findUnique({
      where: { id: params.commerceId },
      select: { businessHours: true }
    });

    const status = getBusinessStatus(commerce?.businessHours as any);
    let finalNotes = params.notes || '';
    if (!status.isOpen && status.nextOpeningText) {
      const tag = `[FUERA DE HORARIO - Apertura: ${status.nextOpeningText}]`;
      finalNotes = finalNotes ? `${tag} ${finalNotes}` : tag;
    }

    const provider = await this.getProviderForCommerce(params.commerceId);
    const result = await provider.createOrder({ ...params, notes: finalNotes });

    if (result.success && result.orderId) {
      try {
        const createdOrder = await prisma.order.findUnique({
          where: { id: result.orderId }
        });

        if (createdOrder) {
          const pub = getRedisPub();
          await pub.publish('order_events', JSON.stringify({
            type: 'NEW_ORDER',
            commerceId: params.commerceId,
            order: {
              ...createdOrder,
              isOutOfHours: !status.isOpen
            }
          }));
        }
      } catch (pubErr) {
        console.error('[OrderService] Error publicando evento order_events en Redis:', pubErr);
      }
    }

    return result;
  }
}
