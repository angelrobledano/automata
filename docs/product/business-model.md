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

## 2. Motor de Planes (Configurabilidad B2B)

El sistema ha abandonado el modelo tradicional de planes programados (hardcoded). En su lugar, utilizamos un **Motor de Planes Dinámico** (Feature Flags).

- **Planes Dinámicos**: Los administradores de la plataforma pueden crear planes (Ej: "Starter", "Pro") directamente desde un Dashboard.
- **Límites como Capacidades**: Cada plan tiene una lista de `PlanFeature` (ej. `max_conversations = 100`, `whatsapp_enabled = true`). Esto permite cambiar los límites o habilitar nuevos canales sin desplegar código nuevo.
- **Overage Behavior (Control de Exceso)**: Una característica clave para la confianza B2B. Cuando un cliente agota su presupuesto de IA (Tokens o Conversaciones), el sistema ofrece dos vías, elegibles por el cliente:
  1. **HARD_LIMIT**: El bot se desactiva hasta el próximo ciclo de facturación. Cero sorpresas en la factura.
  2. **METERED_BILLING**: El bot sigue funcionando y se cobra el excedente (Overage) a final de mes.

## 3. Caché Semántica como Ventaja Competitiva

Además de controlar el límite, el sistema incluye una tabla `SemanticCache`. 
Si 50 clientes de un comercio preguntan "A qué hora abren mañana", solo la primera pregunta genera un coste en OpenAI. Las siguientes 49 preguntas hacen match en la búsqueda de similitud local (similitud de coseno > 0.95) y se responden desde caché.
- **Impacto de Negocio**: Reduce drásticamente los costes de OpenAI (aumentando los márgenes de beneficio del SaaS) y disminuye el tiempo de respuesta, mejorando la experiencia del cliente final.
