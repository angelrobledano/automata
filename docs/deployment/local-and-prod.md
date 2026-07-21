# Guía de Despliegue y Configuración (Local y Producción)

El proyecto está compuesto por dos servidores Node.js independientes (Frontend Next.js en la subcarpeta `dashboard/` y Backend Express en la raíz) más servicios externos (PostgreSQL con soporte de vectores y Redis para colas asíncronas).

---

## 💻 1. Configuración del Entorno de Desarrollo Local

Sigue estos pasos detallados para arrancar y configurar el proyecto completo en tu máquina de desarrollo local.

### Requisitos Previos
- **Node.js**: Versión 20 o superior.
- **Docker & Docker Compose**: Para levantar las instancias locales de Postgres y Redis.
- **API Keys**: Cuenta de OpenAI (para la generación de embeddings y respuestas del chatbot) y opcionalmente LlamaCloud (para indexar PDFs complejos).

---

### Paso 1: Configurar Variables de Entorno (`.env`)

#### En la Raíz del Proyecto (Configuración del Backend)
Crea un archivo `.env` en la raíz del repositorio (`agente-pedidos/.env`):
```env
# Puerto del Servidor Express
PORT=3001

# Base de Datos (PostgreSQL con extensión Vector activa)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/automata?schema=public"

# Servidor de colas asíncronas
REDIS_URL="redis://localhost:6379"

# Proveedor de Inteligencia Artificial (OpenAI)
OPENAI_API_KEY="tu-clave-api-de-openai"

# LlamaCloud API Key (Opcional, para parsear PDFs con LlamaParse)
LLAMA_CLOUD_API_KEY=""

# Clave de encriptación simétrica AES-256-GCM para tokens de WhatsApp en DB (Debe tener 32 caracteres)
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef"

# Sentry DSN (Opcional, para telemetría APM activa en backend)
SENTRY_DSN=""
```

#### En la Carpeta `dashboard/` (Configuración del Frontend)
Crea un archivo `.env.local` en la subcarpeta `dashboard/` (`agente-pedidos/dashboard/.env.local`):
```env
# URL de comunicación con la API del Backend
NEXT_PUBLIC_API_URL="http://localhost:3001"

# JWT Secret para sesiones de usuario del dashboard
JWT_SECRET="un-secreto-para-firmar-tokens-jwt"
```

---

### Paso 2: Levantar la Infraestructura Local

Usaremos Docker Compose para levantar las dependencias de base de datos y colas:
```bash
# Levantar PostgreSQL (con soporte pgvector) y Redis
docker-compose up -d
```

---

### Paso 3: Inicializar Base de Datos y Prisma

Una vez que Postgres esté listo, ejecutamos las migraciones para generar las tablas (incluyendo las tablas de caché vectorial y embeddings):
```bash
# Instalar dependencias en la raíz
npm install

# Ejecutar migraciones de base de datos
npx prisma migrate dev

# Generar cliente de Prisma
npx prisma generate
```

---

### Paso 4: Levantar los Servicios en Desarrollo

El proyecto tiene configurado `concurrently` en la raíz para iniciar el servidor de API, el procesador de mensajes y el procesador de documentos en paralelo:
```bash
# Levantar el backend de forma concurrente
npm run dev
```

En otra terminal, entra a la carpeta `dashboard` y levanta el servidor Next.js de desarrollo:
```bash
cd dashboard

# Instalar dependencias del frontend
npm install

# Levantar Next.js
npm run dev
```
- La landing page minimalista estará disponible en `http://localhost:3000`.
- El backend de API estará respondiendo en `http://localhost:3001`.

---

### Paso 5: Exponer Webhooks al exterior (Requisito de Meta / WhatsApp)
La API de WhatsApp Cloud requiere una URL pública segura (HTTPS). Para el desarrollo local, puedes usar un túnel:
```bash
# Opción con Cloudflared (Túnel gratuito recomendado)
cloudflared tunnel --url http://localhost:3001
```
*Copia la URL HTTPS resultante y configúrala en el Dashboard de tu App de Meta como URL de retorno del Webhook.*

---

### Paso 6: Ejecutar y Validar Tests Unitarios e Integración

Disponemos de una suite de pruebas automatizadas en Vitest que validan todos los flujos de facturación, webhook de pagos, onboarding y simulación del chat de la IA.
```bash
cd dashboard
npm run test
```
*Asegúrate de que los 39 tests pasen correctamente (`39 passed`) antes de proceder con cualquier despliegue.*

---

## ☁️ 2. Entorno de Producción

En producción, la arquitectura recomendada es desplegar el frontend de forma estática/serverless y el backend/workers como procesos dedicados.

### Opción PaaS (Vercel + Railway/Render)
1. **Frontend**: Conecta el repositorio de GitHub y despliega la subcarpeta `dashboard/` en Vercel. 
   - Añade `NEXT_PUBLIC_API_URL=https://api.tu-dominio.com` en sus variables de entorno.
2. **Backend**: Despliega la raíz del repositorio en Render o Railway.
   - Ejecuta: `npm run build && npm run start:api`
3. **Workers**: Despliega procesos paralelos ejecutando los comandos `npm run start:worker` (hilo de IA) y `npm run start:docworker` (hilo de documentos/PDFs).
4. **Base de Datos**: Requiere Postgres 15+ con extensión `vector` activa (disponible por defecto en proveedores como Supabase o Neon).
5. **Redis**: Utiliza Upstash o Redis Labs para gestionar las colas del webhook.
