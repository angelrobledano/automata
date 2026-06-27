# Seguridad y Autenticación

Este proyecto está diseñado bajo una arquitectura Multi-Tenant pura, donde un comercio NUNCA debe acceder a los datos de otro comercio.

## 1. Autenticación del Dashboard (Admin)

El panel de administración (Next.js) utiliza JWT (JSON Web Tokens) para autenticar a los propietarios de los comercios.

### Flujo de Login
1. El usuario envía sus credenciales al endpoint `/api/auth/login`.
2. Se verifica la contraseña usando `bcrypt`.
3. Se genera un Token JWT firmado con `process.env.JWT_SECRET` válido por 7 días.
4. El token incluye el `userId` y el `commerceId`.
5. El token se envía al cliente en una Cookie `HttpOnly`, `Secure` (en producción), y `SameSite=Strict`.

### Middlewares de Seguridad
Todo el panel Next.js y todas las rutas bajo `/api/*` (excepto `/api/auth` y `/api/webhooks`) pasan por el `middleware.ts`.
- El middleware verifica que la cookie `session_token` exista y sea válida.
- Extrae el `commerceId` del token y lo inyecta en los headers de la request (`x-commerce-id`).
- Todo el código de la API posterior lee `x-commerce-id` garantizando que una petición REST solo pueda listar, leer, o modificar datos (mensajes, sesiones, configuraciones) que pertenezcan explícitamente a ese `commerceId`.

## 2. Autenticación de Webhooks (Terceros)

Los webhooks están completamente expuestos a Internet.

### Meta Webhooks
- Meta verifica la titularidad del endpoint enviando un `GET` con `hub.verify_token`.
- Para los mensajes entrantes (`POST`), Meta firma la petición con un `X-Hub-Signature-256`. Actualmente validamos el JSON interno y su estructura. (Idealmente en el futuro se verificará la firma criptográfica usando el App Secret).

## 3. Seguridad a Nivel de Base de Datos
Todos los tokens de OAuth proporcionados por los comercios (Access Tokens de Meta System Users) que permiten al bot responder por ellos, **SE CIFRAN** antes de guardarse en la base de datos usando AES-256 (`src/utils/crypto.ts` -> `ENCRYPTION_KEY`). Esto mitiga drásticamente el impacto de una posible fuga de datos o brecha en PostgreSQL.
