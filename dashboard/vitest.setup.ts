import '@testing-library/jest-dom';

// Entorno de test: crypto.ts es fail-closed y exige ENCRYPTION_KEY de 32 chars al importarse.
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-dashboard-tests';

