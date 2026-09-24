import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests del procesador del worker (extraído de worker.ts).
 * Cubren B-03 (reintentos vs idempotencia) y B-04 (entrega real antes de persistir).
 */

vi.mock('../db/prisma', () => ({
  prisma: {
    channelConnection: { findFirst: vi.fn() },
    session: { update: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('../db/session', () => ({
  getOrCreateSession: vi.fn(),
  getSessionMessages: vi.fn(),
  addMessageToSession: vi.fn(),
}));

vi.mock('../ai', () => ({
  generateAIResponse: vi.fn(),
}));

vi.mock('../integrations/omnichannel', () => ({
  sendOmnichannelMessage: vi.fn(),
  sendOmnichannelFormattedMessage: vi.fn(),
}));

vi.mock('../formatters/channel-formatter', () => ({
  formatForChannel: vi.fn((text: string) => text),
  ChannelType: 'WHATSAPP',
}));

vi.mock('@sentry/node', () => ({
  startSpan: vi.fn((_options: unknown, fn: () => unknown) => fn()),
  captureException: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

vi.mock('../utils/pii', () => ({
  sanitizePII: vi.fn((text: string) => text),
}));

vi.mock('../rag/index', () => ({
  createEmbedding: vi.fn(async () => new Array(1536).fill(0.1)),
  searchSimilarChunks: vi.fn(async () => []),
}));

vi.mock('../utils/businessHours', () => ({
  getBusinessStatus: vi.fn(() => ({ isOpen: true, nextOpeningText: '', currentDay: 'monday', currentTime: '10:00' })),
}));

vi.mock('../billing/core/FeatureGuard', () => ({
  FeatureGuard: {
    canExecute: vi.fn(),
    trackConsumption: vi.fn(),
  },
}));

import { processMetaJob } from '../worker-processor';
import { prisma } from '../db/prisma';
import { getOrCreateSession, getSessionMessages, addMessageToSession } from '../db/session';
import { generateAIResponse } from '../ai';
import { sendOmnichannelFormattedMessage } from '../integrations/omnichannel';
import { FeatureGuard } from '../billing/core/FeatureGuard';

const mockedFindFirst = vi.mocked(prisma.channelConnection.findFirst);
const mockedGetSession = vi.mocked(getOrCreateSession);
const mockedGetMessages = vi.mocked(getSessionMessages);
const mockedAddMessage = vi.mocked(addMessageToSession);
const mockedGenerate = vi.mocked(generateAIResponse);
const mockedSend = vi.mocked(sendOmnichannelFormattedMessage);
const mockedCanExecute = vi.mocked(FeatureGuard.canExecute);
const mockedQueryRaw = vi.mocked(prisma.$queryRaw);

function makeFakeConnection(existingKey: boolean) {
  return {
    set: vi.fn(async () => (existingKey ? null : 'OK')),
    publish: vi.fn(async () => {}),
  } as any;
}

function makeJob(overrides: { attemptsMade?: number } = {}) {
  return {
    id: 'job-test-1',
    attemptsMade: overrides.attemptsMade ?? 0,
    opts: { attempts: 3 },
    data: {
      channel: 'WHATSAPP',
      receiverId: 'phone-123',
      senderId: '34600000000',
      text: 'Hola, ¿qué horario tenéis?',
      originalPayload: { messages: [{ id: 'wamid.TEST1' }] },
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();

  mockedFindFirst.mockResolvedValue({
    id: 'cc-1',
    provider: 'META',
    channelPhoneId: 'phone-123',
    channelAccountId: null,
    commerce: {
      id: 'commerce-1',
      name: 'Tienda Test',
      systemPrompt: 'Eres un asistente de la tienda.',
      aiModel: 'gpt-4o-mini',
      aiTemperature: 0.2,
      businessHours: null,
    },
  } as any);

  mockedGetSession.mockResolvedValue({
    id: 'session-1',
    status: 'AI_ACTIVE',
    controlBy: 'AI',
    waitingSince: null,
  } as any);

  mockedGetMessages.mockResolvedValue([]);
  mockedGenerate.mockResolvedValue('Respuesta de la IA');
  mockedCanExecute.mockResolvedValue({ allowed: true } as any);
  mockedQueryRaw.mockResolvedValue([] as any); // cache miss
});

describe('processMetaJob — idempotencia vs reintentos (B-03)', () => {
  it('REINTENTO: si la clave de dedup ya existe (intento previo falló), el reintento SÍ procesa el mensaje', async () => {
    const connection = makeFakeConnection(true);
    const job = makeJob({ attemptsMade: 1 });

    await processMetaJob(job, connection);

    // El mensaje no se pierde: se genera respuesta y se envía
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(mockedSend.mock.calls[0]![3]).toBe('Respuesta de la IA');
  });

  it('PRIMER INTENTO con clave de dedup existente: descarta el duplicado (protección contra webhooks repetidos)', async () => {
    const connection = makeFakeConnection(true);
    const job = makeJob({ attemptsMade: 0 });

    await processMetaJob(job, connection);

    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('PRIMER INTENTO con clave nueva: procesa el flujo completo (caracterización)', async () => {
    const connection = makeFakeConnection(false);
    const job = makeJob({ attemptsMade: 0 });

    await processMetaJob(job, connection);

    expect(connection.set).toHaveBeenCalledWith('processed_msg:wamid.TEST1', '1', 'EX', 86400, 'NX');
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedSend).toHaveBeenCalledTimes(1);
    // Mensaje de usuario guardado una vez, mensaje de assistant una vez
    expect(mockedAddMessage).toHaveBeenCalledTimes(2);
    expect(mockedAddMessage.mock.calls[0]![1]).toBe('user');
  });
});

describe('processMetaJob — entrega antes de persistir (B-04)', () => {
  it('si el envío al canal falla, el job rechaza y NO persiste el mensaje del assistant como enviado', async () => {
    const connection = makeFakeConnection(false);
    const job = makeJob({ attemptsMade: 0 });
    mockedSend.mockRejectedValue(new Error('Graph API down'));

    await expect(processMetaJob(job, connection)).rejects.toThrow('Graph API down');

    // Solo el mensaje del usuario debe estar persistido; el assistant no (nunca llegó al cliente)
    const persistedRoles = mockedAddMessage.mock.calls.map(c => c[1]);
    expect(persistedRoles).toEqual(['user']);
  });
});
