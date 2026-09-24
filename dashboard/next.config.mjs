import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  // Monorepo con dos lockfiles (raíz + dashboard): fijar la raíz de Turbopack
  // evita el warning de "workspace root inferred" y resuelve módulos del
  // backend (../../src/*) de forma determinista.
  turbopack: {
    root: path.join(__dirname, '..'),
  },
};

export default nextConfig;
