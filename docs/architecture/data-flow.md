# Flujo de Datos y Eventos

## 1. Recepción y Procesamiento de Mensajes (Inbound)

El flujo crítico del sistema es la recepción de un mensaje de WhatsApp y su respuesta. Este proceso está optimizado para la máxima fiabilidad y baja latencia.

```mermaid
sequenceDiagram
    participant User as Cliente WhatsApp
    participant Meta as Meta Cloud API
    participant Webhook as Express API (Webhook)
    participant Redis as Redis (Idempotencia)
    participant Queue as BullMQ (Redis)
    participant Worker as Worker Node
    participant DB as PostgreSQL (Prisma)
    participant Guard as FeatureGuard
    participant OpenAI as OpenAI API

    User->>Meta: Envía mensaje
    Meta->>Webhook: HTTP POST /api/webhooks/meta
    Webhook->>Redis: SETNX processed_msg:id (Evita duplicados)
    alt Es duplicado
        Webhook-->>Meta: 200 OK (Descartado)
    else Es nuevo
        Webhook->>Queue: Encola el mensaje
        Webhook-->>Meta: 200 OK (Aceptado y diferido)
    end

    Queue->>Worker: Desencola job
    Worker->>DB: getOrCreateSession()
    
    Worker->>Guard: canExecute('conversations')
    Guard->>DB: Consulta PlanFeature y Consumption actual
    alt Límite Excedido y Overage = HARD_LIMIT
        Guard-->>Worker: Denegado
        Worker-->>User: "Sistema en mantenimiento" (Vía Meta)
    else Permitido (Dentro de límites o METERED_BILLING)
        Guard-->>Worker: Permitido
        
        Worker->>DB: Recupera historial reciente (RAG contextual)
        Worker->>DB: Búsqueda Vectorial (pgvector)
        DB-->>Worker: Retorna Chunks relevantes
        Worker->>OpenAI: generateAIResponse(Context + History + Prompt)
        OpenAI-->>Worker: Respuesta generada
        
        Worker->>Guard: trackConsumption('openai_tokens', amount)
        Guard->>DB: Actualiza tabla Consumption
        Worker->>Meta: Envía respuesta final (POST /messages)
        Meta-->>User: Recibe respuesta
    end
```

## 2. Flujo de Billing (Webhooks de Pago)

Este diagrama ilustra cómo el PaymentEngine maneja los cobros y actualizaciones de suscripción de forma agnóstica.

```mermaid
sequenceDiagram
    participant Stripe as Proveedor (Stripe/Redsys)
    participant API as Express API (Webhook)
    participant Engine as PaymentEngine
    participant Provider as StripeProvider
    participant DB as PostgreSQL (Prisma)

    Stripe->>API: POST /api/billing/webhook
    API->>Engine: processWebhook(body, signature)
    Engine->>Provider: handleWebhook()
    Provider-->>Engine: Devuelve PaymentEvent normalizado
    
    API->>DB: Check Idempotencia (BillingEvent.providerEventId)
    alt Ya procesado
        API-->>Stripe: 200 OK
    else Nuevo Evento
        API->>DB: Upsert Subscription status y Fechas
        API->>DB: Crea registro de auditoría (BillingEvent)
        API-->>Stripe: 200 OK
    end
```
