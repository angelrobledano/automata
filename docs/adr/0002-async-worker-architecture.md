# ADR 0002: Arquitectura de Workers Asíncronos (BullMQ)

## Contexto
El sistema expone endpoints públicos (`/api/webhooks/*`) para recibir notificaciones de WhatsApp Cloud API. WhatsApp exige que sus endpoints respondan un código HTTP 200 en menos de 3 a 5 segundos de forma ininterrumpida. 

## Problema
El flujo de respuesta mediante Inteligencia Artificial involucra:
1. Extraer el contexto del usuario en BBDD.
2. Hacer un embedding de la pregunta en OpenAI (~200ms).
3. Búsqueda Vectorial RAG (~50ms).
4. Generación de chat LLM en OpenAI (~2 a 10 segundos).
5. Inserción en BD.
6. Petición a Meta Graph API para enviar la respuesta.

Este proceso supera frecuentemente los 5 segundos. Si la petición síncrona agota el tiempo, Meta registra un "Timeout", reenvía el mensaje en bucle, y eventualmente puede **bloquear la suscripción al Webhook**.

## Opciones Consideradas
1. Devolver 200 OK inmediatamente e iniciar una Promesa huérfana en Express (`void asyncTask()`). **Riesgo:** Si el servidor se reinicia o crashea durante la petición de OpenAI, el mensaje se pierde para siempre y la memoria de Node se desborda en picos de tráfico.
2. Usar un sistema de colas (Queue) basado en disco persistente (RabbitMQ).
3. Usar Redis + BullMQ.

## Decisión
Se eligió **Redis + BullMQ**.

## Consecuencias y Ventajas
- **Ventaja**: Resiliencia. Los mensajes que entran al webhook se depositan en Redis en `<10ms` y el webhook responde `200 OK` inmediatamente a Meta. Meta nunca sufre timeouts.
- **Ventaja**: Escalabilidad. Se pueden levantar múltiples procesos de Node (`src/worker.ts`) que consuman jobs de Redis concurrentemente.
- **Ventaja**: Control de Fallos. BullMQ gestiona reintentos automáticos (`attempts: 3`, `backoff: exponential`) si falla la red con OpenAI o Meta, garantizando que el mensaje siempre se responda eventualmente.
- **Riesgo**: Requerimos infraestructura adicional (Redis) ejecutándose obligatoriamente en producción.
