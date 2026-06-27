# Analítica y Observabilidad

Para mantener un control férreo sobre lo que ocurre dentro del sistema, utilizamos una estrategia de trazabilidad end-to-end.

## 1. Trazabilidad de Costes (Mensajes)
La entidad `Message` en la base de datos es la fuente primaria de verdad para la facturación y auditoría.

- Cada mensaje generado por el asistente registra los campos `tokensUsed` y `estimatedCost`.
- Esto permite realizar agrupaciones analíticas (ej. "¿Cuánto dinero nos ha costado el Cliente X este mes?").
- Incluye también un registro de latencia (`latencyMs`) para medir posibles cuellos de botella en la API de OpenAI.

## 2. Auditoría Operativa (`AuditLog`)
Cualquier acción administrativa crítica realizada por un humano en el dashboard queda registrada en la tabla `AuditLog`.
- `action`: Tipo de acción (Ej. `UPDATE_SYSTEM_PROMPT`, `HANDOFF_TRIGGERED`).
- `details`: Contexto en JSON del cambio.
- Esto provee trazabilidad para soporte técnico cuando un comercio reporta que "su bot ha dejado de funcionar" (y resulta que alguien borró el System Prompt hace 2 horas).

## 3. Telemetría de Producto (Eventos)

Aunque el stack tecnológico está preparado para integrarse con plataformas de producto (como **PostHog** o Mixpanel), la instrumentación actual se hace mediante logs enriquecidos. 

Eventos de interés primario para tracking de producto:
- `SESSION_STARTED`: Un nuevo usuario interactúa con un comercio.
- `RAG_CACHE_HIT`: El bot responde desde la caché semántica (Métrica de salud de márgenes).
- `HUMAN_HANDOFF`: Un humano pausa al bot. (Un alto índice de handoff indica que el "Cerebro" del RAG está pobremente entrenado o que OpenAI está alucinando).
- `BUDGET_EXCEEDED`: Un comercio superó su cuota de tokens.

### Recomendación de Integración Futura
Para un despliegue masivo B2B, se recomienda instalar el SDK de PostHog en el entorno Next.js y el servidor Express, enviando los eventos anteriores al Data Warehouse central para visualización de retención y Cohorts.
