import { CreateOrderParams, OrderResult, IOrderProvider } from './OrderProvider';
import { LocalOrderProvider } from './LocalOrderProvider';
import { WooCommerceOrderProvider } from './WooCommerceOrderProvider';
import { ShopifyOrderProvider } from './ShopifyOrderProvider';
import { prisma } from '../db/prisma';
import { getBusinessStatus } from '../utils/businessHours';
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

    const status = getBusinessStatus(commerce?.businessHours);
    let finalNotes = params.notes || '';
    if (!status.isOpen && status.nextOpeningText) {
      const tag = `[FUERA DE HORARIO - Apertura: ${status.nextOpeningText}]`;
      finalNotes = finalNotes ? `${tag} ${finalNotes}` : tag;
    }

    const provider = await this.getProviderForCommerce(params.commerceId);
    return provider.createOrder({ ...params, notes: finalNotes });
  }
}
