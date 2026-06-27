# Guía de Despliegue (Local y Producción)

El proyecto está compuesto por dos servidores Node.js independientes (Frontend Next.js y Backend Express) más dependencias externas (PostgreSQL y Redis).

## 1. Entorno de Desarrollo (Local)

El desarrollo local se basa en ejecución directa en baremetal (Node.js) asistida por Docker Compose para la base de datos.

### Infraestructura Local
```bash
# Levanta PostgreSQL (con pgvector) y Redis
docker-compose up -d
```

### Ejecución de Servicios
El proyecto utiliza un script "monorepo-style" en la raíz `package.json` para levantar ambos servicios simultáneamente mediante `concurrently`.

```bash
# Ejecuta las migraciones de Prisma
npx prisma migrate dev

# Levanta Backend (puerto 3001) y Frontend (puerto 3000)
npm run dev
```

### Exponer Webhooks al exterior (Cloudflare)
Meta Cloud API requiere una URL pública y segura (HTTPS). No acepta `localhost`.
```bash
# Abre un túnel usando Cloudflared (gratuito, soporta Webhooks sin pantalla de bloqueo)
cloudflared tunnel --url http://localhost:3001
```
*Copia la URL proporcionada y configúrala en el Dashboard de Meta App -> Webhooks.*

## 2. Entorno de Producción

En producción, la arquitectura recomendada es **Dockerizar todo** o utilizar PaaS separados.

### Despliegue PaaS (Vercel + Railway/Render)
1. **Frontend**: Desplegar la carpeta `dashboard/` en Vercel. 
   - Variable clave: `NEXT_PUBLIC_API_URL=https://api.midominio.com`
2. **Backend**: Desplegar la carpeta raíz en Render o Railway.
   - Ejecutar: `npm run build && npm start`
   - Requiere exponer el puerto del servidor Express (`3001` o el inyectado por `$PORT`).
3. **Database**: Usar Supabase o AWS RDS Postgres con la extensión `pgvector` activada.
4. **Redis**: Usar Upstash o AWS ElastiCache.

### Despliegue VPS Autónomo (Docker Compose Prod)
Para desplegar en un servidor Ubuntu limpio (ej. Hetzner, DigitalOcean), se recomienda crear un `docker-compose.prod.yml` que incluya:
- Contenedor para Redis.
- Contenedor para Postgres.
- Contenedor para Backend (`Dockerfile` que compila TypeScript y corre `node dist/index.js`).
- Contenedor para Frontend (Next.js en modo `standalone`).
- Traefik o Nginx como Proxy Inverso para mapear certificados SSL (Let's Encrypt).
