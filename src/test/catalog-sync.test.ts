import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatalogSyncService } from '../catalog/sync-service';
import { prisma } from '../db/prisma';
import axios from 'axios';

vi.mock('axios');
vi.mock('../rag', () => ({
  createEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.01))
}));
vi.mock('../utils/crypto', () => ({
  decrypt: vi.fn((val: string) => val.replace('enc-', ''))
}));

vi.mock('../db/prisma', () => ({
  prisma: {
    commerce: {
      findUnique: vi.fn()
    },
    knowledgeSource: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    documentChunk: {
      deleteMany: vi.fn(),
      create: vi.fn()
    },
    $executeRaw: vi.fn().mockResolvedValue(1)
  }
}));

describe('CatalogSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWooProducts', () => {
    it('should parse WooCommerce products and clean HTML descriptions', async () => {
      const mockWooProducts = [
        {
          id: 101,
          name: 'Tarta de Queso Artesanal',
          price: '18.50',
          regular_price: '18.50',
          description: '<p>Deliciosa tarta horneada con <strong>queso crema</strong>.</p>',
          short_description: '<p>Tarta de queso para 8 personas.</p>',
          categories: [{ id: 1, name: 'Tartas' }],
          stock_status: 'instock',
          stock_quantity: 5
        }
      ];

      (axios.get as any).mockResolvedValue({ data: mockWooProducts });

      const products = await CatalogSyncService.fetchWooProducts(
        'https://mitienda.com',
        'ck_123',
        'cs_456'
      );

      expect(products).toHaveLength(1);
      const wooProduct = products[0]!;
      expect(wooProduct.id).toBe(101);
      expect(wooProduct.name).toBe('Tarta de Queso Artesanal');
      expect(wooProduct.price).toBe(18.5);
      expect(wooProduct.description).toBe('Tarta de queso para 8 personas.');
      expect(wooProduct.category).toBe('Tartas');
      expect(wooProduct.inStock).toBe(true);
      expect(wooProduct.stockQuantity).toBe(5);
    });
  });

  describe('fetchShopifyProducts', () => {
    it('should parse Shopify products and variants', async () => {
      const mockShopifyProducts = [
        {
          id: 202,
          title: 'Café de Especialidad Colombia',
          body_html: '<div>Tueste medio, notas a chocolate.</div>',
          product_type: 'Café',
          variants: [
            { id: 1, title: '250g en grano', price: '9.50', inventory_quantity: 12 },
            { id: 2, title: '250g molido', price: '9.50', inventory_quantity: 4 }
          ]
        }
      ];

      (axios.get as any).mockResolvedValue({ data: { products: mockShopifyProducts } });

      const products = await CatalogSyncService.fetchShopifyProducts(
        'mishop.myshopify.com',
        'shpat_test'
      );

      expect(products).toHaveLength(1);
      const shopifyProduct = products[0]!;
      expect(shopifyProduct.id).toBe(202);
      expect(shopifyProduct.name).toBe('Café de Especialidad Colombia');
      expect(shopifyProduct.price).toBe(9.5);
      expect(shopifyProduct.variants).toContain('250g en grano (9.50 €)');
      expect(shopifyProduct.variants).toContain('250g molido (9.50 €)');
      expect(shopifyProduct.inStock).toBe(true);
    });
  });

  describe('syncCommerceCatalog', () => {
    it('should return error if no provider is configured', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-1',
        providerMetadata: {}
      });

      const result = await CatalogSyncService.syncCommerceCatalog('comm-1');
      expect(result.success).toBe(false);
      expect(result.provider).toBe('none');
      expect(result.message).toContain('No hay ninguna tienda online conectada');
    });

    it('should sync WooCommerce catalog and write to KnowledgeSource', async () => {
      (prisma.commerce.findUnique as any).mockResolvedValue({
        id: 'comm-woo',
        providerMetadata: {
          wooUrl: 'https://woo.tienda.com',
          wooConsumerKey: 'enc-ck123',
          wooConsumerSecret: 'enc-cs456'
        }
      });

      (axios.get as any).mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'Croissant Francés',
            price: '2.20',
            description: 'Mantequilla 100%',
            stock_status: 'instock',
            stock_quantity: 20
          }
        ]
      });

      (prisma.knowledgeSource.findFirst as any).mockResolvedValue(null);
      (prisma.knowledgeSource.create as any).mockResolvedValue({ id: 'ks-new-id' });
      (prisma.documentChunk.create as any).mockResolvedValue({ id: 'dc-1' });

      const result = await CatalogSyncService.syncCommerceCatalog('comm-woo');

      expect(result.success).toBe(true);
      expect(result.provider).toBe('woocommerce');
      expect(result.productsCount).toBe(1);
      expect(prisma.knowledgeSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commerceId: 'comm-woo',
            category: 'PRODUCTS',
            type: 'CATALOG'
          })
        })
      );
      expect(prisma.documentChunk.create).toHaveBeenCalled();
    });
  });
});
