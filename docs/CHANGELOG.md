# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-28
### Added
- **Billing Engine Multi-Provider**: Nuevo sistema arquitectónico para manejar suscripciones usando el Patrón Strategy. (Actualmente integrado con Stripe, preparado para Redsys).
- **Motor de Planes Dinámico**: Interfaz de administración en `/admin/plans` para crear planes con límites granulares (Feature Flags) almacenados como K-V en la base de datos sin necesidad de despliegues.
- **Overage Behavior Control**: Los usuarios pueden elegir en su portal si quieren que su bot se apague al llegar al límite (`HARD_LIMIT`) o que siga funcionando con cobro por uso (`METERED_BILLING`).
- **FeatureGuard Middleware**: Todas las ejecuciones de IA ahora pasan por un control estricto que lee la tabla de Consumos (`Consumption`) en tiempo real.
- **Idempotencia Estricta en Pagos**: Tabla `BillingEvent` para rastrear Webhooks de Stripe y evitar dobles procesamientos ante fallos de red.
- **Tests de Dominio**: Suite de tests Vitest para cubrir `FeatureGuard` y `PaymentEngine`.

### Changed
- Refactorización masiva de `Commerce` en Prisma: Se eliminan campos heredados de Stripe (`stripeCustomerId`, etc.) en favor de campos agnósticos (`billingProvider`, `billingCustomerId`).
- Arquitectura documental: 11 archivos de documentación actualizados para reflejar la infraestructura B2B real, esquemas C4 actualizados.

## [1.0.0] - 2026-06-26
### Added
- Inicialización del proyecto Open Source.
- Implementación de RAG Híbrido (pgvector + BM25 + RRF).
- Integración de Webhooks inmortales con Meta WhatsApp API y BullMQ.
- Dashboard Omnicanal en Next.js.
