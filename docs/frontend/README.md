# Arquitectura Frontend (Dashboard Next.js)

El panel de administración "Mi Negocio IA" está construido utilizando **Next.js 14** con el nuevo **App Router**.

## 1. Stack Tecnológico Frontend
- **Framework**: Next.js (App Router).
- **Estilos**: Tailwind CSS.
- **Componentes**: UI components basados en Radix UI / shadcn-ui.
- **Tiempo Real**: Socket.io-client (conectado al backend Express).
- **Autenticación**: Server-side cookies validadas en el Middleware de Next.js.

## 2. Estructura de Rutas
- `/login`: Pantalla de inicio de sesión público.
- `/dashboard`: Panel de resumen, métricas generales de uso de tokens y volumen de mensajes.
- `/conversaciones`: El Inbox Omnicanal en tiempo real. Interfaz similar a WhatsApp Web con soporte para Handoff (pausa de IA).
- `/cerebro`: Panel de gestión del RAG. Permite subir documentos (texto o PDF) que se envían al backend para ser procesados y vectorizados.
- `/configuracion`: Parámetros del comercio, System Prompt, credenciales de Meta y facturación.

## 3. Manejo de Estado en Tiempo Real (WebSockets)
El componente más crítico del frontend es el `InboxClient.tsx`.
- Mantiene una conexión persistente vía WebSocket con el servidor `localhost:3001` (Backend).
- Al recibir el evento `new_message`, muta el estado local de React optimísticamente, permitiendo ver las respuestas de la IA y los clientes instantáneamente sin recargar la página.
- Si entra un mensaje de un cliente completamente nuevo, se dispara una recarga en background (`fetch`) para traer los datos completos de la nueva sesión.

## 4. Protección de Rutas (Middleware)
El archivo `middleware.ts` en la raíz de Next.js actúa como guardián:
- Extrae el JWT de las cookies.
- Si no es válido, redirige al `/login`.
- Si es válido, extrae el `commerceId` del JWT y lo inyecta en los headers (`x-commerce-id`) hacia las API routes del backend, asegurando un aislamiento total entre diferentes negocios.
