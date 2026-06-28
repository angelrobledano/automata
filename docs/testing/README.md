# Testing e Integración Continua (CI)

Este repositorio sigue una filosofía pragmática de testing orientada a las partes críticas del negocio.

## Estrategia de Testing

No pretendemos un 100% de cobertura en la interfaz de usuario (Next.js) que está sujeta a cambios frecuentes de diseño. Los esfuerzos de prueba deben concentrarse en el **Backend** y en los algoritmos críticos de **IA**.

### 1. Tests Unitarios (Jest)
En la carpeta `tests/unit/`:
- **Utilidades criptográficas**: Se debe verificar siempre que `encrypt()` y `decrypt()` sean reversibles y robustos, ya que custodian tokens de acceso ajenos.
- **RAG & Chunking**: Asegurarnos de que el `TextSplitter` corta correctamente en los saltos de párrafo y no a mitad de una palabra o SKU crítico.

### 2. Tests de Dominio y Billing (Vitest)
El core de validación de límites y pagos debe estar testeado al 100%. Usamos Vitest para ello (`src/test/billing/`):
- **`FeatureGuard.test.ts`**: Verifica que se bloquea el acceso si el plan está consumido (`HARD_LIMIT`) o se permite si tiene la configuración de cobro por uso (`METERED_BILLING`).
- **`PaymentEngine.test.ts`**: Verifica el Patrón Adapter, garantizando que StripeProvider (u otros proveedores futuros) es instanciado y se delegan los métodos correctamente sin romper el Inversion of Control.

### 3. Tests de Integración (Supertest)
En la carpeta `tests/integration/`:
- **Protección de Tenancy**: Asegurar que una petición a `/api/sessions` inyectando un token manipulado de un `commerceId` en el que no se tienen permisos devuelva siempre un `403 Forbidden` o `404 Not Found`.

### 3. Simulador RAG en Vivo (QA Manual/Automático)
El sistema incluye un simulador interno en el panel "Cerebro" del dashboard.
- Este simulador utiliza los mismos endpoints que WhatsApp. 
- Permite a los desarrolladores y a los propios comerciantes testear las capacidades del bot (búsqueda léxica vs semántica) antes de exponerlo a clientes reales.

## Configuración Local para Pruebas
Para ejecutar tests que dependan de PostgreSQL y PgVector, se recomienda usar una base de datos efímera en Docker (Testcontainers) o un archivo `.env.test` que apunte a un esquema `public_test` para no ensuciar los datos de desarrollo.
