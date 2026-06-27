# ADR 0004: Estrategia Defensiva en Webhooks de Meta

## Contexto
El sistema es el núcleo receptor de mensajes para N comercios, todos centralizados en un único endpoint de Express (`/api/webhooks/meta`).

## Problema
Meta es implacable con la latencia. Si el webhook de la aplicación experimenta demoras de más de 3-5 segundos, o errores HTTP 5xx, Meta activa un retroceso exponencial (Exponential Backoff). Si este comportamiento persiste (por ejemplo, porque la API de OpenAI está caída y causa errores 500 en cascada), Meta retira silenciosamente los permisos de la aplicación y bloquea la entrega de mensajes a la cuenta afectada.

## Decisión
Se implementó una política de **Aceptación Incondicional y Validación Diferida**.

1. **Aceptación Ciega Inmediata:**
   El endpoint `/api/webhooks/meta` solo realiza dos acciones síncronas: verificar que existe el objeto JSON `messages` y depositar el Payload entero en Redis (BullMQ). Acto seguido, retorna `200 OK`. Todo ocurre en < 15ms.

2. **Idempotencia Forzada (Redis SETNX):**
   Meta puede enviar el mismo mensaje múltiples veces si cree que hubo un fallo de red. El webhook inserta el ID del mensaje usando `SETNX` en Redis con un TTL de 24 horas. Si el ID ya existía, se descarta para no cobrar a OpenAI dos veces ni duplicar el chat en la UI.

3. **Fallback Robusto en Fallos de Payload:**
   En versiones inestables de la Meta API, campos como `metadata` desaparecen. El código contiene encadenamiento opcional (`payload?.metadata?.phone_number_id || body.entry[0].id`) garantizando que nunca se produzca un `TypeError: undefined is not an object` en tiempo de recepción.

## Consecuencias
- **Ventaja**: El webhook es virtualmente indestructible ante caídas de terceros (OpenAI) o bases de datos lentas.
- **Ventaja**: Protegemos la integridad de nuestra Meta App, evitando ser vetados del ecosistema.
- **Riesgo**: Devolvemos 200 OK incluso si sabemos que el ID de teléfono destino no existe en la base de datos (se detecta y descarta silenciosamente después en el Worker).
