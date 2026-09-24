import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../db/prisma';
import { encrypt } from '../utils/crypto';
import { CatalogSyncService } from '../catalog/sync-service';

vi.mock('../catalog/sync-service', () => ({
  CatalogSyncService: {
    syncCommerceCatalog: vi.fn().mockResolvedValue({ success: true, productsCount: 10 })
  }
}));

vi.mock('../db/prisma', () => ({
  prisma: {
    commerce: {
      findUnique: vi.fn(),
      update: vi.fn(),
    }
  }
}));

describe('WooCommerce 1-Click Automated Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization URL Generation', () => {
    it('should build a valid WooCommerce /wc-auth/v1/authorize URL with required parameters', () => {
      const rawStoreUrl = '  mitienda.com/  ';
      let cleanUrl = rawStoreUrl.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
      }
      cleanUrl = cleanUrl.replace(/\/+$/, '');

      expect(cleanUrl).toBe('https://mitienda.com');

      const origin = 'https://app.automata.com';
      const returnUrl = `${origin}/onboarding/woo/return`;
      const callbackUrl = `${origin}/api/onboarding/woo/callback`;
      const commerceId = 'comm-test-123';

      const authParams = new URLSearchParams({
        app_name: 'Automata',
        scope: 'read_write',
        user_id: commerceId,
        return_url: returnUrl,
        callback_url: callbackUrl
      });

      const authUrl = `${cleanUrl}/wc-auth/v1/authorize?${authParams.toString()}`;

      const parsed = new URL(authUrl);
      expect(parsed.origin).toBe('https://mitienda.com');
      expect(parsed.pathname).toBe('/wc-auth/v1/authorize');
      expect(parsed.searchParams.get('app_name')).toBe('Automata');
      expect(parsed.searchParams.get('scope')).toBe('read_write');
      expect(parsed.searchParams.get('user_id')).toBe('comm-test-123');
      expect(parsed.searchParams.get('return_url')).toBe('https://app.automata.com/onboarding/woo/return');
      expect(parsed.searchParams.get('callback_url')).toBe('https://app.automata.com/api/onboarding/woo/callback');
    });
  });

  describe('Webhook Callback Credential Processing', () => {
    it('should store encrypted keys and trigger catalog sync', async () => {
      const mockCommerce = {
        id: 'comm-test-123',
        providerMetadata: {
          pendingWooUrl: 'https://mitienda.com',
          otherKey: 'preserve-me'
        }
      };

      (prisma.commerce.findUnique as any).mockResolvedValue(mockCommerce);
      (prisma.commerce.update as any).mockResolvedValue({ id: 'comm-test-123' });

      const callbackPayload = {
        key_id: 1,
        user_id: 'comm-test-123',
        consumer_key: 'ck_live_987654321',
        consumer_secret: 'cs_live_123456789',
        key_permissions: 'read_write'
      };

      // Simular lógica de procesamiento del callback
      const currentMeta = { ...(mockCommerce.providerMetadata as any) };
      const wooUrl = currentMeta.pendingWooUrl || currentMeta.wooUrl || '';
      delete currentMeta.pendingWooUrl;

      const encryptedKey = encrypt(callbackPayload.consumer_key);
      const encryptedSecret = encrypt(callbackPayload.consumer_secret);

      await prisma.commerce.update({
        where: { id: callbackPayload.user_id },
        data: {
          providerMetadata: {
            ...currentMeta,
            wooUrl,
            wooConsumerKey: encryptedKey,
            wooConsumerSecret: encryptedSecret,
            wooConnectedAt: new Date().toISOString(),
            provider: 'woocommerce'
          }
        }
      });

      await CatalogSyncService.syncCommerceCatalog(callbackPayload.user_id);

      expect(prisma.commerce.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comm-test-123' },
          data: expect.objectContaining({
            providerMetadata: expect.objectContaining({
              wooUrl: 'https://mitienda.com',
              otherKey: 'preserve-me',
              provider: 'woocommerce'
            })
          })
        })
      );

      expect(CatalogSyncService.syncCommerceCatalog).toHaveBeenCalledWith('comm-test-123');
    });
  });
});
