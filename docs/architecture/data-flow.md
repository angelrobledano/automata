# Flujo de Datos (Data Flow)

Este documento traza el ciclo de vida completo de un mensaje desde que un cliente escribe por WhatsApp hasta que recibe la respuesta de la IA.

## Ciclo de Vida de un Mensaje (WhatsApp a IA)

```mermaid
sequenceDiagram
    participant User as Cliente (WhatsApp)
    participant Meta as Meta Cloud API
    participant Webhook as Express Webhook
    participant Redis as BullMQ (Redis)
    participant Worker as Meta Worker
    participant DB as PostgreSQL (Prisma)
    participant RAG as Sistema RAG
    participant OpenAI as OpenAI LLM
    participant Socket as Socket.io (Next.js)

    User->>Meta: Envía "Hola, quiero info"
    Meta->>Webhook: POST /api/webhooks/meta (Payload JSON)
    
    Webhook->>Redis: Verifica Idempotencia (SETNX)
    Webhook->>Redis: job.add('meta-messages', payload)
    Webhook-->>Meta: 200 OK (Inmediato)
    
    Redis-->>Worker: Extrae Job de la cola
    Worker->>DB: Busca ChannelConnection (receiverId)
    Worker->>DB: Obtiene o crea Session
    Worker->>DB: Guarda Message (role: user)
    Worker->>Socket: Emit 'new_message' (UI update)
    
    alt Sesión en HUMAN_CONTROL
        Worker-->>Worker: Aborta IA
    else Presupuesto excedido
        Worker-->>User: Mensaje de error de mantenimiento
    else Flujo Normal IA
        Worker->>DB: Obtiene últimas 15 interacciones (Historial)
        Worker->>RAG: searchSimilarChunks(texto_usuario)
        RAG->>OpenAI: createEmbedding(texto_usuario)
        RAG->>DB: Búsqueda Vectorial + BM25 (RRF)
        RAG-->>Worker: Fragmentos de conocimiento relevantes
        
        Worker->>OpenAI: generateAIResponse(historial, chunks_RAG)
        OpenAI-->>Worker: Respuesta de la IA
        
        Worker->>DB: Guarda Message (role: assistant)
        Worker->>Socket: Emit 'new_message' (UI update)
        
        Worker->>Meta: POST /messages (Graph API)
        Meta-->>User: Recibe respuesta en WhatsApp
    end
```

### Explicaciones de los pasos clave

1. **Idempotencia (`SETNX`)**: Meta reintenta los webhooks si hay fallos de red. Para evitar respuestas duplicadas, usamos `Redis SETNX` con el ID único del mensaje que provee Meta. Si ya existe, se descarta silenciosamente.
2. **ChannelConnection Resolution**: El worker busca a qué comercio pertenece el número de WhatsApp receptor. Si un mensaje llega pero no hay conexión en la base de datos (por error de tipeo en el ID, por ejemplo), el worker lo descarta con error.
3. **Control de Contexto (Windowing)**: Solo enviamos a OpenAI los últimos 15 mensajes de la sesión para ahorrar tokens y evitar el desbordamiento de la ventana de contexto.
4. **Handoff (Control Humano)**: El chequeo de estado de la sesión (`HUMAN_CONTROL`) se hace en el worker *antes* de llamar al RAG o a OpenAI, garantizando que el bot no se entrometa si un humano está al mando.
