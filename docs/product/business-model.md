# Modelo de Negocio y Producto

Este documento describe las decisiones de producto y negocio implementadas en el código base, orientadas a la monetización y la sostenibilidad operativa del sistema.

## 1. Monetización y Facturación (SaaS)

El proyecto está diseñado bajo un modelo de Software as a Service (SaaS) B2B.

### Entidad Core: `Commerce`
Toda la lógica de negocio pivota sobre la tabla `Commerce` (Multi-tenancy). Cada comercio representa a un cliente de pago (o en capa gratuita).

Campos críticos para el negocio:
- `stripeCustomerId` y `stripeSubscriptionId`: Preparados para la integración con Stripe Billing (suscripciones recurrentes).
- `subscriptionStatus`: Define si el servicio está activo, impagado o cancelado.
- `isLifetimeFree`: Un flag de gracia (booleano) implementado para "comercios amigos" o betas, que bypasea temporalmente las restricciones de facturación.

## 2. Economía Unit Flow (Tokens y Costes)

El principal gasto operativo de este sistema son las llamadas a la API de OpenAI. Para evitar que un usuario malintencionado de WhatsApp agote el presupuesto del sistema (Ataques de Denegación de Billetera / DoW), se implementó un sistema estricto de control de tokens.

### Presupuestos (`Token Budgeting`)
1. **Asignación Mensual**: Cada comercio recibe un `monthlyTokenBudget` (ej. 100,000 tokens) según su plan de suscripción.
2. **Consumo en Tiempo Real**: Durante el procesamiento en `worker.ts`, se cuentan o estiman los tokens ingeridos (Prompt + RAG Context) y los generados (Completion). 
3. **Descuento Inmediato**: Se incrementa el contador `tokensUsedThisMonth` del comercio.

### Límite Excedido (Hard Cap)
Cuando un comercio supera su presupuesto:
- El sistema **bloquea la llamada a OpenAI** inmediatamente (no se genera gasto).
- El worker inyecta un mensaje fallback de "Mantenimiento Temporal" y lo envía al usuario de WhatsApp.
- El dueño del comercio debe hacer un "up-sell" a un plan superior para restaurar el servicio.

## 3. Caché Semántica como Ventaja Competitiva

Además de controlar el límite, el sistema incluye una tabla `SemanticCache`. 
Si 50 clientes de un comercio preguntan "A qué hora abren mañana", solo la primera pregunta genera un coste en OpenAI. Las siguientes 49 preguntas hacen match en la búsqueda de similitud local (similitud de coseno > 0.95) y se responden desde caché.
- **Impacto de Negocio**: Reduce drásticamente los costes de OpenAI (aumentando los márgenes de beneficio del SaaS) y disminuye el tiempo de respuesta, mejorando la experiencia del cliente final.
