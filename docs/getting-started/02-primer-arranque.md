# 2. Primer Arranque

## Infraestructura Local
Necesitas Docker para levantar la base de datos (PostgreSQL + pgvector) y Redis.

```bash
docker-compose up -d
```

## Entorno
Copia el archivo `.env.example` a `.env` y solicita a tu Engineering Manager las claves de OpenAI y Meta Webhooks para desarrollo.

## Migraciones
```bash
npx prisma migrate dev
```

## Levantar Servicios
```bash
npm run dev
```
Esto levantará el Backend en el puerto 3001 y el Dashboard en el 3000.
