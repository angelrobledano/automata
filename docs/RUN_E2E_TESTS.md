# Guía Rápida: Ejecutar y Probar el MVP (Pruebas End-to-End)

Para probar la plataforma en un entorno real con Meta (WhatsApp) y WooCommerce, sigue estos pasos rigurosamente.

## Requisitos Previos
1. **ngrok** instalado en tu ordenador (para exponer el puerto local a internet).
2. Clave de API de **OpenAI** válida (`OPENAI_API_KEY` en el archivo `.env`).
3. Una app en **Meta for Developers** con el producto de WhatsApp configurado (modo pruebas).
4. Un sitio de **WooCommerce** (puede ser local o en la nube) con las claves de API REST generadas (`Consumer Key` y `Consumer Secret`).

## Paso 1: Configurar el Comercio en Base de Datos
Debes actualizar el registro del comercio en tu base de datos local para usar las claves reales.
Puedes hacerlo visualmente ejecutando:
```bash
npx prisma studio
```
Abre `http://localhost:5555`, ve a la tabla `Commerce` y edita la fila creada por el seed:
- `waPhoneNumberId`: El "Identificador de número de teléfono" que te da Meta.
- `waToken`: Un token de acceso temporal de Meta (o permanente si tienes usuario de sistema).
- `wooUrl`: URL de tu WooCommerce (ej. `https://mi-tienda.com`).
- `wooConsumerKey`: Clave de WooCommerce (empieza por `ck_`).
- `wooConsumerSecret`: Secreto de WooCommerce (empieza por `cs_`).

## Paso 2: Arrancar la Infraestructura
Abre una terminal en este directorio y asegúrate de que Docker está corriendo:
```bash
docker-compose up -d
```

En la misma terminal, arranca el servidor web y los workers asíncronos (BullMQ):
```bash
npm run dev
```
*Deberías ver los mensajes: `[Server] Escuchando en http://localhost:3000` y `[Worker] Iniciado y escuchando colas...`*

## Paso 3: Exponer el Webhook con ngrok
Abre una **nueva terminal** y ejecuta ngrok apuntando al puerto de nuestro servidor (3000):
```bash
ngrok http 3000
```
Copia la URL segura que te da ngrok, por ejemplo: `https://abcd-12-34-56-78.ngrok-free.app`

## Paso 4: Configurar Meta Webhook
1. Ve al panel de **Meta for Developers** > Tu App > WhatsApp > Configuración.
2. En la sección "Webhooks", haz clic en **Editar**.
3. **URL de devolución de llamada (Callback URL):** Pega tu URL de ngrok y añade la ruta:
   `https://abcd-12-34-56-78.ngrok-free.app/api/webhooks/meta`
4. **Token de verificación:** Escribe `test_token` (o lo que hayas configurado en `.env` como `META_VERIFY_TOKEN`).
5. Haz clic en **Verificar y guardar**.
6. En la lista de Webhooks, suscríbete al evento `messages`.

## Paso 5: La Prueba Final (End-to-End)
1. Envía un mensaje de WhatsApp desde tu móvil al número de prueba de Meta.
2. Mira tu consola local:
   - Verás `Mensaje encolado con éxito`.
   - El Worker dirá `Procesando job... Mensaje recibido de X...`
   - Si la IA te pregunta detalles, respóndele (ej. "Quiero una tarta de queso para mañana a las 18:00").
3. Una vez confirmes el pedido respondiendo "Sí", el Worker detectará la *Function Calling*, enviará el pedido a WooCommerce y te responderá con el ID final.
4. Entra en el wp-admin de tu WooCommerce > Pedidos, ¡y ahí estará!
