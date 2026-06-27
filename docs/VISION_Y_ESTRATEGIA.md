# Visión, Estrategia y Arquitectura (Visión a 3 Años)

## 1. El Problema y la Oportunidad
Los pequeños comercios (pastelerías, floristerías) dedican excesivo tiempo a la toma de pedidos vía WhatsApp o teléfono. Este sistema tiene como objetivo crear un agente de inteligencia artificial que reciba el pedido, estructure la comanda, interactúe con el cliente y genere automáticamente la orden en el sistema de gestión del comercio (empezando por WooCommerce).

El objetivo es construir un **SaaS multi-tenant escalable a 10.000 comercios**.

## 2. Decisiones de Producto (CPO)
*   **Foco Principal:** Eliminar la fricción de la toma manual de pedidos.
*   **Onboarding:** Sin fricción. Uso de Meta Embedded Signup. El cliente nunca debe pelearse con tokens complejos.
*   **MVP (v1.0):** Modalidad "Concierge". Sin panel de control de usuario. Conectamos directamente WhatsApp de comercios reales a su WooCommerce configurando la base de datos a mano. Objetivo: Validar la transacción pura.

## 3. Decisiones de Arquitectura (CTO)
La arquitectura está diseñada para sobrevivir a picos de tráfico extremos y a la rigidez de la Meta Graph API.

### Tolerancia a Fallos
Meta exige respuestas 200 OK en sus webhooks en menos de 20 segundos. Las peticiones a LLMs pueden tardar más. Por tanto, el webhook y el procesamiento están **desacoplados**:
1.  Webhook Node.js -> Mete el payload en BullMQ (Redis) -> Responde 200 OK.
2.  Worker Node.js -> Lee de BullMQ -> Llama a OpenAI -> Llama a WooCommerce -> Envía respuesta a Meta.

### Modelo de Datos (Prisma)
-   `Tenant`: El cliente principal.
-   `Commerce`: Una tienda específica bajo ese Tenant.
-   `Session`: Conversación activa de WhatsApp.
-   `Message`: Registro de todo lo hablado (necesario para el contexto de OpenAI).

### Seguridad
Aislamiento lógico estricto por `tenantId`.

## 4. Diseño y UX (Designer)
Aunque la v1.0 no tiene panel, la experiencia de usuario del comprador final por WhatsApp debe ser excelente:
-   **No robótico:** Uso de System Prompts personalizados para que el bot hable con el tono de la marca.
-   **Confirmación obligatoria:** Nunca se inyecta un pedido en WooCommerce sin una confirmación explícita (resumen final) al comprador.
-   **Prevención de Hallucinations:** El bot solo vende lo que se le instruye en su base de conocimiento.

---
*Documento vivo. Actualizar conforme el proyecto escale.*
