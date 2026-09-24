import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests de envío WhatsApp (B-04): los errores de la Graph API deben propagarse
 * para que BullMQ reintente y el sistema sepa que el cliente no recibió respuesta.
 */

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}));

import axios from 'axios';
import { sendWhatsAppMessage, sendWhatsAppFormattedMessage } from '../integrations/whatsapp';

const mockedPost = vi.mocked(axios.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendWhatsAppMessage', () => {
  it('rechaza cuando la Graph API devuelve error (para que el worker reintente)', async () => {
    mockedPost.mockRejectedValueOnce({
      response: { data: { error: { message: '(#131047) Reengagement message' } } },
    });

    await expect(
      sendWhatsAppMessage('phone-123', 'token', '34600000000', 'Hola')
    ).rejects.toThrow();
  });

  it('resuelve sin errores cuando el envío tiene éxito (caracterización)', async () => {
    mockedPost.mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.1' }] } } as any);

    await expect(
      sendWhatsAppMessage('phone-123', 'token', '34600000000', 'Hola')
    ).resolves.not.toThrow();

    expect(mockedPost).toHaveBeenCalledTimes(1);
  });
});

describe('sendWhatsAppFormattedMessage', () => {
  const plainMessage = { text: 'Hola', buttons: [] } as any;

  it('rechaza cuando el envío de texto plano falla (para que el worker reintente)', async () => {
    mockedPost.mockRejectedValueOnce({ response: { data: { error: { message: 'timeout' } } } });

    await expect(
      sendWhatsAppFormattedMessage('phone-123', 'token', '34600000000', plainMessage)
    ).rejects.toThrow();
  });

  it('mantiene el fallback a texto plano cuando el mensaje con botones falla (caracterización)', async () => {
    const messageWithButtons = {
      text: 'Elige una opción',
      buttons: [{ type: 'reply', title: 'Opción 1' }],
    } as any;

    mockedPost
      .mockRejectedValueOnce({ response: { data: { error: { message: 'cuenta no verificada' } } } })
      .mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.2' }] } } as any);

    await expect(
      sendWhatsAppFormattedMessage('phone-123', 'token', '34600000000', messageWithButtons)
    ).resolves.not.toThrow();

    // Dos llamadas: la interactiva que falló + el fallback de texto
    expect(mockedPost).toHaveBeenCalledTimes(2);
  });

  it('rechaza si el fallback a texto plano también falla', async () => {
    const messageWithButtons = {
      text: 'Elige una opción',
      buttons: [{ type: 'reply', title: 'Opción 1' }],
    } as any;

    mockedPost
      .mockRejectedValueOnce({ response: { data: { error: { message: 'cuenta no verificada' } } } })
      .mockRejectedValueOnce({ response: { data: { error: { message: 'fallback también falla' } } } });

    await expect(
      sendWhatsAppFormattedMessage('phone-123', 'token', '34600000000', messageWithButtons)
    ).rejects.toThrow();
  });
});
