# Mi Negocio IA (Agente Pedidos) 🤖📦

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/typescript-%5E5.0-blue)

Un agente conversacional autónomo para empresas (WhatsApp, Webchat, Instagram), potenciado por un motor **RAG Híbrido (Vectorial + BM25)** y **OpenAI**, con un dashboard administrativo completo en **Next.js**.

---

## 📖 Índice Maestro de Documentación

Esta sección funciona como la Wiki principal del proyecto. Todo lo que un desarrollador necesita saber está enlazado aquí.

### 🚀 Para Nuevos Desarrolladores (Onboarding)
Si acabas de unirte al proyecto, empieza por aquí:
1. [Clonar el Proyecto](./docs/getting-started/01-clonar-el-proyecto.md)
2. [Primer Arranque e Instalación](./docs/getting-started/02-primer-arranque.md)
3. [Cómo Depurar el Sistema](./docs/getting-started/03-como-depurar.md)
4. [Cómo Crear tu Primera Feature](./docs/getting-started/04-como-crear-tu-primera-feature.md)

### 🏛️ Arquitectura y Código
- [Estructura del Proyecto y Carpetas](./docs/project-structure.md)
- [Convenciones de Arquitectura y Estilo](./docs/architecture/conventions.md)
- [Diagramas C4 (Contexto y Contenedores)](./docs/architecture/c4-model.md)
- [Ciclo de Vida de un Mensaje (Secuencia)](./docs/architecture/message-lifecycle.md)
- [Arquitectura Frontend (Next.js)](./docs/frontend/README.md)
- [Mapa de Endpoints de la API](./docs/api/endpoints.md)

### 🧠 El Negocio y el Dominio
- **[Glosario Ubicuo](./docs/glossary.md)** (Lectura OBLIGATORIA para entender el vocabulario interno).
- [Dominio: Commerce y Tenant](./docs/domain/commerce.md)
- [Dominio: Conversations y Messages](./docs/domain/conversation.md)
- [Dominio: Knowledge y Sistema RAG](./docs/domain/knowledge.md)

### 🤖 IA e Integraciones
- [El Sistema RAG Híbrido al Detalle](./docs/rag/README.md)
- [Integración con WhatsApp Cloud API](./docs/integrations/meta-whatsapp.md)
- [Integración con OpenAI](./docs/integrations/openai.md)

### ⚖️ Decisiones y ADRs (Por qué hacemos lo que hacemos)
- [ADR-01: Postgres y Prisma](./docs/adr/0001-postgresql-and-prisma.md)
- [ADR-02: Workers Asíncronos](./docs/adr/0002-async-worker-architecture.md)
- [ADR-03: Sistema RAG Híbrido](./docs/adr/0003-hybrid-rag-system.md)
- [ADR-04: Estrategia de Webhooks Inmortales](./docs/adr/0004-meta-webhook-strategy.md)
- **Decisiones Descartadas:**
  - [¿Por qué NO usamos LangChain entero?](./docs/adr/rejected/0001-why-not-langchain-full.md)
  - [¿Por qué NO usamos Pinecone?](./docs/adr/rejected/0002-why-not-pinecone.md)
  - [¿Por qué NO usamos Firebase?](./docs/adr/rejected/0003-why-not-firebase.md)

### 📊 Operaciones, DevOps y Monitorización
- [Decisiones de Producto y Negocio](./docs/product/decisions.md)
- [Analítica y Observabilidad](./docs/observability/README.md)
- [Rendimiento Esperado (Performance)](./docs/performance/README.md)
- [Seguridad y Autenticación Multi-Tenant](./docs/security/authentication.md)
- [Despliegue (Local y Producción)](./docs/deployment/local-and-prod.md)
- [Estrategia de Testing y CI](./docs/testing/README.md)
- **Runbooks (Qué hacer cuando todo arde):**
  - [Fallos en Webhooks de WhatsApp](./docs/runbooks/whatsapp-webhook-failures.md)
- **Checklists para Despliegues Seguros:**
  - [Release](./docs/checklists/release.md) | [Seguridad](./docs/checklists/security.md) | [Despliegue](./docs/checklists/deployment.md) | [Base de Datos](./docs/checklists/database.md)

### 🔮 Futuro
- [Roadmap Técnico](./docs/roadmap.md)
- [Guía de Contribución](./docs/CONTRIBUTING.md)
- [Registro de Cambios (Changelog)](./docs/CHANGELOG.md)

---
*Hecho con ❤️ para que el conocimiento resida en el repositorio y no solo en la cabeza de los desarrolladores.*
