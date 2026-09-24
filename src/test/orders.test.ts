import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalOrderProvider } from '../orders/LocalOrderProvider';
import { WooCommerceOrderProvider } from '../orders/WooCommerceOrderProvider';
import { ShopifyOrderProvider } from '../orders/ShopifyOrderProvider';
import { OrderService } from '../orders/OrderService';
import { prisma } from '../db/prisma';

// Mock Prisma
vi.mock('../db/prisma', () => ({
  prisma: {
    order: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    commerce: {
      findUnique: vi.fn(),
    }
  }
}));

describe('Multi-Store Order Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LocalOrderProvider', () => {
    it('should create a local encargo and generate an order number', async () => {
      const mockCreatedOrder = {
        id: '12345678-abcd-ef01-2345-6789abcdef01',
        commerceId: 'comm-1',
        externalOrderId: 'ENC-123456',
        customerName: 'Juan Pérez',
        customerPhone: '+34600112233',
        deliveryType: 'PICKUP',
        items: [{ name: 'Tarta de queso', quantity: 2, price: 15 }],
        totalAmount: 30,
        status: 'PENDING'
      };

      (prisma.order.create as any).mockResolvedValue(mockCreatedOrder);

      const provider = new LocalOrderProvider();
      const result = await provider.createOrder({
        commerceId: 'comm-1',
        customerName: 'Juan Pérez',
        customerPhone: '+34600112233',
        deliveryType: 'PICKUP',
        items: [{ name: 'Tarta de queso', quantity: 2, price: 15 }]
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('MANUAL');
      expect(result.totalAmount).toBe(30);
      expect(result.orderNumber).toBe('ENC-123456');
      expect(prisma.order.create).toHaveBeenCalled();
    });
  });

  describe('WooCommerceOrderProvider', () => {
    it('should fallback to local order if WooCommerce metadata is missing or invalid', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-woo',
        providerMetadata: {} // Sin credenciales Woo
      });

      (prisma.order.create as any).mockResolvedValue({
        id: 'woo-fallback-id-123',
        commerceId: 'comm-woo',
        status: 'PENDING'
      });

      const provider = new WooCommerceOrderProvider();
      const result = await provider.createOrder({
        commerceId: 'comm-woo',
        customerName: 'Cliente Woo',
        customerPhone: '+34611223344',
        deliveryType: 'PICKUP',
        items: [{ name: 'Producto Woo', quantity: 1, price: 10 }]
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('WOOCOMMERCE');
      expect(result.message).toContain('guardado localmente');
    });
  });

  describe('ShopifyOrderProvider', () => {
    it('should fallback to local order if Shopify metadata is missing or invalid', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-shopify',
        providerMetadata: {} // Sin credenciales Shopify
      });

      (prisma.order.create as any).mockResolvedValue({
        id: 'shopify-fallback-id-123',
        commerceId: 'comm-shopify',
        status: 'PENDING'
      });

      const provider = new ShopifyOrderProvider();
      const result = await provider.createOrder({
        commerceId: 'comm-shopify',
        customerName: 'Cliente Shopify',
        customerPhone: '+34622334455',
        deliveryType: 'DELIVERY',
        deliveryAddress: 'Calle Mayor 10',
        items: [{ name: 'Camiseta', quantity: 1, price: 25 }]
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('SHOPIFY');
      expect(result.message).toContain('guardado localmente');
    });
  });

  describe('OrderService Provider Selection', () => {
    it('should route to WooCommerce when commerce has woo credentials', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-woo-active',
        providerMetadata: {
          wooUrl: 'https://mitienda.com',
          wooConsumerKey: 'ck_test_123'
        }
      });

      const provider = await OrderService.getProviderForCommerce('comm-woo-active');
      expect(provider).toBeInstanceOf(WooCommerceOrderProvider);
    });

    it('should route to Shopify when commerce has shopify credentials', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-shopify-active',
        providerMetadata: {
          shopifyShopUrl: 'mitienda.myshopify.com',
          shopifyAccessToken: 'shpat_test_123'
        }
      });

      const provider = await OrderService.getProviderForCommerce('comm-shopify-active');
      expect(provider).toBeInstanceOf(ShopifyOrderProvider);
    });

    it('should route to LocalOrderProvider when commerce has no external store', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-local',
        providerMetadata: {}
      });

      const provider = await OrderService.getProviderForCommerce('comm-local');
      expect(provider).toBeInstanceOf(LocalOrderProvider);
    });
  });
});
