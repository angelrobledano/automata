# Estructura del Repositorio

## `/src` (Backend Core)
- **Responsabilidad**: Lógica asíncrona, API REST, procesamiento de Webhooks e interacciones con DB.
- **Qué contiene**: Express server, BullMQ workers, integraciones.
- **Qué NO debe contener**: Código React, UI, CSS.

## `/dashboard/src` (Frontend)
- **Responsabilidad**: Panel de control para el administrador del comercio.
- **Qué contiene**: Next.js App Router, componentes Shadcn, llamadas fetch.
- **Qué NO debe contener**: Lógica directa de IA o conexiones directas a Redis.

## `/prisma`
- **Responsabilidad**: Definición y migraciones del esquema de base de datos relacional y vectorial.

## Dependencias Permitidas
- El Frontend puede depender de `lucide-react`, `shadcn/ui`.
- El Backend puede depender de `bullmq`, `ioredis`, `openai`.
