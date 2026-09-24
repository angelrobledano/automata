import { vi } from 'vitest';
import dotenv from 'dotenv';

dotenv.config();

// Variables de entorno para tests (respetando .env si está configurado)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:password123@localhost:5433/agente_pedidos?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';

// Podemos mockear Prisma aquí si hacemos tests unitarios
// vi.mock('../db/prisma', () => ({
//   prisma: { ...mockMethods }
// }));
