"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock variables de entorno para tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/testdb';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.OPENAI_API_KEY = 'sk-test-key';
// Podemos mockear Prisma aquí si hacemos tests unitarios
// vi.mock('../db/prisma', () => ({
//   prisma: { ...mockMethods }
// }));
//# sourceMappingURL=setup.js.map