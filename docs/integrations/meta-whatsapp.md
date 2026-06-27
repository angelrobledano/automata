# Integración: WhatsApp Cloud API (Meta)

El sistema soporta canales de comunicación múltiples, pero Meta (WhatsApp) es el componente primario y más crítico a nivel de infraestructura.

## Arquitectura de la Integración

### Autenticación y Autorización (OAuth)
Cuando un comercio vincula su WhatsApp desde el Dashboard:
1. El usuario navega al flujo de "Facebook Login for Business".
2. Selecciona su negocio y su número (WABA - WhatsApp Business Account).
3. Nos ceden un **System User Access Token** (que debe cifrarse y guardarse).
4. Solicitamos permisos vitales: `whatsapp_business_messaging`, `whatsapp_business_management`.
5. Extraemos el `channelAccountId` (WABA ID) y el `channelPhoneId` (ID del Teléfono emisor).

**Nota Crítica:** Las configuraciones de los webhooks están atadas a la **App de Meta**, pero Meta exige que el WABA "se suscriba" a la App de Meta explícitamente (`POST /{waba_id}/subscribed_apps`). Esto se hace vía código.

### Webhooks y Verificación
La validación del webhook entrante en `GET /api/webhooks/meta` requiere responder con el parámetro `hub.challenge` si y solo si el parámetro `hub.verify_token` coincide con nuestra variable de entorno `META_WEBHOOK_VERIFY_TOKEN`.

### Estructura de Mensajes Entrantes
La llegada de mensajes se maneja en el archivo `src/webhooks/meta.ts`:
1. **Mensaje Real**: Meta envía el `metadata.phone_number_id` (nuestro número receptor) y `messages[0].from` (el cliente).
2. **Status Updates**: Notificaciones de entrega (sent, delivered, read). El backend actual ignora los status explícitamente filtrando aquellos payloads que NO contienen la clave `messages` o que tengan la clave `statuses`.

## Errores Comunes y Mitigación

### El "Doble Check" de la Muerte
WhatsApp muestra un doble tick gris (Enviado al servidor) tan pronto como nuestro servidor Express devuelve un `200 OK`. Si el código que procesa el mensaje *después* falla, el cliente creerá que el mensaje fue leído pero no respondido. Por esto es vital mantener la lógica del webhook ultra ligera y delegar todo al `BullMQ Worker`.

### Penalización de Timeout de Meta
Si un Webhook devuelve código `500` o excede el timeout:
- Meta intentará el envío de forma exponencial (inmediato, 5 minutos, 10 min, 1 hora).
- Si la tasa de fallos de la App es muy alta (cercana al 100%), Meta activa un kill-switch y **desuscribe la WABA de la App** sin notificar al usuario.

**Solución Implementada**:
- `BullMQ` se traga el trabajo asíncrono.
- La tabla de `ChannelConnection` almacena el ID del canal rigurosamente. Si llega un mensaje huérfano, devolvemos `200 OK` pero lanzamos un `console.warn()` para no perjudicar la salud de la App en los servidores de Meta.
