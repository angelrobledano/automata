# Runbook: Fallos en Webhooks de WhatsApp

Este documento contiene los pasos de diagnóstico y solución para el problema más común en producción: **"Los clientes escriben por WhatsApp pero el bot no responde y la web no se actualiza"**.

## 1. Síntomas Habituales
- Los usuarios envían mensajes y solo obtienen 1 tick gris (no entregado).
- Los usuarios envían mensajes, obtienen 2 ticks grises (entregado), pero el bot no responde nunca.
- En los logs del servidor Express no aparece el prefijo `[Webhook] Mensaje entrante de WA recibido...`.

## 2. Diagnóstico

### Paso 2.1: Verificar el túnel / proxy reverso
Meta exige HTTPS. Si estás en local usando `cloudflared` o `ngrok`, asegúrate de que el túnel está activo.
1. Haz una petición manual con cURL o ThunderClient a `https://<TU_DOMINIO_HTTPS>/api/health` o similar para verificar que la ruta base existe.
2. Comprueba en el panel de desarrollador de Meta (WhatsApp -> Configuración de la API -> Webhooks) que la URL inscrita sea correcta y carezca de espacios en blanco finales.

### Paso 2.2: Verificar Logs del Worker
Si el webhook recibe el mensaje (2 ticks grises), significa que Express recibió el POST.
Si el bot no respondió, el problema está en la cola asíncrona.
Revisa los logs del Worker buscando esto:
`[Worker] No se encontró channel connection para el receiverId: XXXXXXX`

**Causa Raíz:** Meta está enviando un `phone_number_id` (XXXXXXX) que no coincide exactamente con el `channelPhoneId` guardado en la base de datos para ese comercio. 
**Solución:** Extraer el número exacto del log e insertarlo/actualizarlo en la tabla `ChannelConnection` en la base de datos mediante Prisma Studio (`npx prisma studio`).

### Paso 2.3: La Penalización "Shadow-ban" de Meta
Si el servidor devolvió Error 500 reiteradamente, Meta te penaliza desvinculando silenciosamente tu App de la cuenta WABA. 

**Cómo verificar si Meta te ha expulsado:**
Haz una petición a la Graph API utilizando el System User Access Token del usuario:
`GET https://graph.facebook.com/v20.0/{waba_id}/subscribed_apps`

Si la respuesta es un array vacío `{"data":[]}`, o el `id` devuelto no coincide con el App ID de tu aplicación principal, estás desuscrito.

**Solución (Forzar re-suscripción):**
Lanza un comando POST forzoso usando el token del comercio:
```javascript
// Usar fetch o cURL
POST https://graph.facebook.com/v20.0/{waba_id}/subscribed_apps
Headers: Authorization: Bearer {token}
```
Si devuelve `{"success":true}`, pide al cliente que vuelva a mandar un mensaje de WhatsApp. El sistema volverá a la vida instantáneamente.
