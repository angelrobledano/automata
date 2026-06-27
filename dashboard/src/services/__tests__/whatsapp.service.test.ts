import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsAppService } from '../whatsapp.service';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WhatsAppService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendTextMessage', () => {
    it('should successfully send a message and return true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.123' }] })
      });

      const result = await WhatsAppService.sendTextMessage(
        'phone-id-123',
        '34600000000',
        'Hola cliente',
        'test-token'
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v19.0/phone-id-123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '34600000000',
            type: 'text',
            text: { body: 'Hola cliente' }
          })
        })
      );
    });

    it('should return false if API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Invalid token' } })
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await WhatsAppService.sendTextMessage(
        'phone-id-123',
        '34600000000',
        'Hola cliente',
        'invalid-token'
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should catch exceptions and return false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await WhatsAppService.sendTextMessage(
        'phone-id-123',
        '34600000000',
        'Hola cliente',
        'test-token'
      );

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
