# Endpoints y API REST Interna

Aunque el sistema es un monolito dividido en Frontend (Next) y Backend (Express), ambos se comunican a través de una API REST privada montada en Express.

## Convenciones Base
- Base URL (Producción): `https://api.midominio.com/api`
- Base URL (Desarrollo): `http://localhost:3001/api`
- Autenticación: Vía cabecera inyectada internamente `x-commerce-id` (proveniente de la cookie descifrada en Next.js).

## 1. Webhooks (Públicos)
Rutas expuestas a Internet que NO requieren `x-commerce-id`.

- `GET /api/webhooks/meta`: Endpoint de verificación del Challenge de Meta.
- `POST /api/webhooks/meta`: Recepción de eventos y mensajes de WhatsApp.

## 2. API Privada (Requiere Sesión Administrativa)

### Conversaciones
- `GET /api/sessions`: Devuelve las conversaciones abiertas del comercio.
- `GET /api/sessions/:id/messages`: Devuelve el historial completo de chat para renderizar el UI.
- `POST /api/sessions/:id/messages`: Permite al admin enviar un mensaje escrito manualmente al cliente final (a través de Meta).
- `POST /api/sessions/:id/handoff`: Pausa a la IA (`HUMAN_CONTROL`) o le devuelve el control (`ACTIVE`).

### RAG & Conocimiento
- `POST /api/knowledge`: Recibe textos o PDFs subidos por el admin. Lanza internamente el TextSplitter y la creación de Embeddings.
- `GET /api/knowledge`: Lista los documentos actualmente vectorizados en la BD.
- `DELETE /api/knowledge/:id`: Elimina un documento y todos sus vectores (Chunks) asociados, haciendo que la IA "lo olvide".

### Gestión de Cuenta
- `POST /api/auth/login`: Validación y emisión de JWT.
- `GET /api/commerce/stats`: Devuelve las métricas del dashboard (Tokens consumidos, etc).
