# Modelo C4 (Context & Container)

## 1. System Context Diagram
Muestra el sistema en su entorno macro.

```mermaid
C4Context
  title System Context para Mi Negocio IA
  Person(customer, "Cliente de Tienda", "Usuario final en WhatsApp")
  Person(admin, "Dueño de Tienda", "Administrador B2B")
  
  System(system, "Agente Pedidos", "Sistema central de RAG y mensajería")
  
  System_Ext(meta, "Meta Cloud API", "Plataforma WhatsApp")
  System_Ext(openai, "OpenAI API", "Motor LLM y Embeddings")
  System_Ext(stripe, "Stripe", "Facturación")

  Rel(customer, meta, "Envía mensajes")
  Rel(meta, system, "Reenvía mensajes vía Webhook")
  Rel(system, meta, "Envía respuestas de la IA")
  
  Rel(admin, system, "Configura Knowledge Base y reglas")
  Rel(system, openai, "Consulta completaciones y vectores")
  Rel(system, stripe, "Cobra suscripciones y tokens")
```

## 2. Container Diagram
Muestra las piezas ejecutables (Contenedores) del sistema.

```mermaid
C4Container
  title Container Diagram para Mi Negocio IA
  Person(customer, "Cliente", "WhatsApp User")
  Person(admin, "Propietario", "Dashboard User")
  
  System_Ext(meta, "Meta API")
  System_Ext(openai, "OpenAI API")
  
  Container(frontend, "Next.js Dashboard", "React", "Panel de administración omnicanal")
  Container(backend, "Express API", "Node.js", "Recibe webhooks y sirve API privada")
  Container(worker, "BullMQ Workers", "Node.js", "Procesa IA asíncronamente")
  
  ContainerDb(db, "PostgreSQL", "Relacional + Vector", "Almacena Tenancy, Chats y Chunks de RAG")
  ContainerDb(redis, "Redis", "En memoria", "Cola de trabajos (BullMQ) y Rate Limiting")

  Rel(admin, frontend, "Navega", "HTTPS")
  Rel(frontend, backend, "Consume API REST", "JSON/HTTPS")
  
  Rel(meta, backend, "Webhooks Inbound", "JSON/HTTPS")
  Rel(backend, redis, "Encola mensajes", "TCP")
  
  Rel(worker, redis, "Desencola mensajes", "TCP")
  Rel(worker, db, "Lee/Escribe estado y RAG", "Prisma/TCP")
  Rel(worker, openai, "Genera respuestas", "REST")
  Rel(worker, meta, "Envía respuestas al cliente", "REST")
```
