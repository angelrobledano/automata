import { prisma } from '../db/prisma';
import { decrypt } from '../utils/crypto';
import { createEmbedding } from '../rag';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import axios from 'axios';

export interface CatalogProduct {
  id: string | number;
  name: string;
  price: number;
  description: string;
  category?: string;
  inStock: boolean;
  stockQuantity?: number | null;
  variants?: string[];
}

export class CatalogSyncService {
  /**
   * Elimina tags HTML de descripciones de productos
   */
  private static stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Obtiene productos de WooCommerce
   */
  static async fetchWooProducts(wooUrl: string, consumerKey: string, consumerSecret: string): Promise<CatalogProduct[]> {
    const cleanUrl = wooUrl.replace(/\/+$/, '');
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // B-22: paginación real (antes: solo la primera página de 100 productos;
    // catálogos grandes quedaban truncados indefinidamente).
    const perPage = 100;
    const maxPages = 10; // cota de seguridad: 1000 productos por sync
    const rawProducts: any[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const response = await axios.get(
        `${cleanUrl}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=publish`,
        { headers: { 'Authorization': `Basic ${auth}` }, timeout: 15000 }
      );
      const batch = Array.isArray(response.data) ? response.data : [];
      rawProducts.push(...batch);
      if (batch.length < perPage) break;
    }

    return rawProducts.map((p: any) => {
      const price = parseFloat(p.price || p.regular_price || '0') || 0;
      const cats = Array.isArray(p.categories) ? p.categories.map((c: any) => c.name).join(', ') : undefined;
      const inStock = p.stock_status === 'instock' || (typeof p.stock_quantity === 'number' && p.stock_quantity > 0);

      return {
        id: p.id,
        name: p.name || 'Sin nombre',
        price,
        description: this.stripHtml(p.short_description || p.description || ''),
        category: cats,
        inStock,
        stockQuantity: p.stock_quantity ?? null
      };
    });
  }

  /**
   * Obtiene productos de Shopify
   */
  static async fetchShopifyProducts(shopUrl: string, accessToken: string): Promise<CatalogProduct[]> {
    const cleanShop = shopUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    };

    // B-22: paginación por cursor (header Link) — antes solo 100 productos.
    const rawProducts: any[] = [];
    let endpoint: string | null = `https://${cleanShop}/admin/api/2024-01/products.json?limit=250&status=active`;
    let page = 0;
    const maxPages = 10; // cota de seguridad

    while (endpoint && page < maxPages) {
      const response: any = await axios.get(endpoint, { headers, timeout: 15000 });
      const batch = response.data?.products;
      if (!Array.isArray(batch)) break;
      rawProducts.push(...batch);
      const linkHeader: string | undefined = response.headers?.link;
      const nextMatch: RegExpMatchArray | null = linkHeader?.match(/<([^>]+)>;\s*rel="next"/) || null;
      endpoint = nextMatch ? nextMatch[1]! : null;
      page++;
    }

    return rawProducts.map((p: any) => {
      const firstVariant = Array.isArray(p.variants) && p.variants[0] ? p.variants[0] : null;
      const price = firstVariant?.price ? parseFloat(firstVariant.price) : 0;
      const variants = Array.isArray(p.variants) && p.variants.length > 1
        ? p.variants.map((v: any) => `${v.title} (${v.price} €)`)
        : undefined;

      const inStock = Array.isArray(p.variants) 
        ? p.variants.some((v: any) => (v.inventory_quantity ?? 0) > 0 || v.inventory_policy === 'continue')
        : true;

      return {
        id: p.id,
        name: p.title || 'Sin nombre',
        price,
        description: this.stripHtml(p.body_html || ''),
        category: p.product_type || undefined,
        inStock,
        variants
      };
    });
  }

  /**
   * Sincroniza el catálogo de la tienda activa del comercio con la base de conocimiento RAG
   */
  static async syncCommerceCatalog(commerceId: string): Promise<{
    success: boolean;
    provider: 'woocommerce' | 'shopify' | 'none';
    productsCount: number;
    message: string;
  }> {
    const commerce = await prisma.commerce.findUnique({
      where: { id: commerceId }
    });

    if (!commerce) {
      return { success: false, provider: 'none', productsCount: 0, message: 'Comercio no encontrado' };
    }

    const meta = (commerce.providerMetadata as any) || {};
    let products: CatalogProduct[] = [];
    let provider: 'woocommerce' | 'shopify' | 'none' = 'none';

    // 1. Intentar sincronización con WooCommerce
    if (meta.wooUrl && meta.wooConsumerKey && meta.wooConsumerSecret) {
      try {
        const decryptedKey = decrypt(meta.wooConsumerKey);
        const decryptedSecret = decrypt(meta.wooConsumerSecret);
        products = await this.fetchWooProducts(meta.wooUrl, decryptedKey, decryptedSecret);
        provider = 'woocommerce';
      } catch (wooErr: any) {
        console.error('[CatalogSyncService] Error sincronizando WooCommerce:', wooErr.message);
        return {
          success: false,
          provider: 'woocommerce',
          productsCount: 0,
          message: `Error al contactar con WooCommerce: ${wooErr.message}`
        };
      }
    } 
    // 2. Intentar sincronización con Shopify
    else if ((meta.shopifyStoreDomain || meta.shopifyShopUrl) && meta.shopifyAccessToken) {
      try {
        const shopUrl = meta.shopifyStoreDomain || meta.shopifyShopUrl;
        const decryptedToken = decrypt(meta.shopifyAccessToken);
        products = await this.fetchShopifyProducts(shopUrl, decryptedToken);
        provider = 'shopify';
      } catch (shopErr: any) {
        console.error('[CatalogSyncService] Error sincronizando Shopify:', shopErr.message);
        return {
          success: false,
          provider: 'shopify',
          productsCount: 0,
          message: `Error al contactar con Shopify: ${shopErr.message}`
        };
      }
    } else {
      return {
        success: false,
        provider: 'none',
        productsCount: 0,
        message: 'No hay ninguna tienda online conectada (WooCommerce o Shopify).'
      };
    }

    if (products.length === 0) {
      return {
        success: true,
        provider,
        productsCount: 0,
        message: 'Conexión exitosa, pero no se encontraron productos publicados en la tienda.'
      };
    }

    // 3. Formatear productos para RAG
    const productFormattedEntries = products.map(p => {
      const parts = [
        `### Producto: ${p.name}`,
        `- Precio: ${p.price.toFixed(2)} €`,
        `- Disponibilidad: ${p.inStock ? 'En stock' : 'Agotado temporalmente'}${p.stockQuantity !== null && p.stockQuantity !== undefined ? ` (${p.stockQuantity} unidades)` : ''}`,
      ];
      if (p.category) parts.push(`- Categoría: ${p.category}`);
      if (p.variants && p.variants.length > 0) parts.push(`- Variantes: ${p.variants.join(' | ')}`);
      if (p.description) parts.push(`- Descripción: ${p.description}`);
      return parts.join('\n');
    });

    const fullCatalogText = productFormattedEntries.join('\n\n---\n\n');

    // 4. Buscar o crear la KnowledgeSource del catálogo
    let source = await prisma.knowledgeSource.findFirst({
      where: {
        commerceId,
        type: 'CATALOG',
        category: 'PRODUCTS'
      }
    });

    if (source) {
      // Limpiar chunks anteriores
      await prisma.documentChunk.deleteMany({
        where: { knowledgeSourceId: source.id }
      });

      source = await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: {
          name: `Catálogo de Productos (${provider === 'shopify' ? 'Shopify' : 'WooCommerce'})`,
          content: fullCatalogText.substring(0, 1000) + `... (${products.length} productos sincronizados)`,
        }
      });
    } else {
      source = await prisma.knowledgeSource.create({
        data: {
          commerceId,
          name: `Catálogo de Productos (${provider === 'shopify' ? 'Shopify' : 'WooCommerce'})`,
          type: 'CATALOG',
          category: 'PRODUCTS',
          content: fullCatalogText.substring(0, 1000) + `... (${products.length} productos sincronizados)`,
        }
      });
    }

    // 5. Chunking y generación de embeddings
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 600, chunkOverlap: 60 });
    const chunks = await splitter.splitText(fullCatalogText);

    let indexedChunks = 0;
    for (const chunkText of chunks) {
      if (chunkText.trim().length < 15) continue;

      try {
        const embedding = await createEmbedding(chunkText.trim());
        const chunk = await prisma.documentChunk.create({
          data: {
            knowledgeSourceId: source.id,
            content: chunkText.trim()
          }
        });

        await prisma.$executeRaw`
          UPDATE "DocumentChunk"
          SET embedding = ${embedding}::vector
          WHERE id = ${chunk.id}
        `;
        indexedChunks++;
      } catch (embedErr) {
        // Si no hay pgvector o API key de OpenAI en tests locales, continuar
        await prisma.documentChunk.create({
          data: {
            knowledgeSourceId: source.id,
            content: chunkText.trim()
          }
        }).catch(() => {});
      }
    }

    return {
      success: true,
      provider,
      productsCount: products.length,
      message: `Se han sincronizado ${products.length} productos (${indexedChunks} fragmentos vectorizados) en la IA.`
    };
  }
}
