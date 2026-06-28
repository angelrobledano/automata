# The Payment Engine (Multi-Provider Billing Architecture)

Este documento explica cómo está construida la infraestructura de monetización del producto.

## El Problema del Acoplamiento
Tradicionalmente, las aplicaciones B2B acoplan su modelo de datos y reglas de negocio directamente al SDK de Stripe. Si marketing quiere cambiar un límite, hay que modificar código o la configuración en el dashboard de Stripe. Si la empresa quiere expandirse a un país donde Stripe es caro y se prefiere Redsys o MercadoPago, hay que reescribir todo el backend.

## Nuestra Solución: El Patrón Strategy

Hemos diseñado el `PaymentEngine`, un adaptador que aísla por completo la lógica de negocio del proveedor de pago.

```typescript
// Core abstraction
export interface IPaymentProvider {
  createCustomer(commerceId: string, email: string, name: string): Promise<BillingCustomer>;
  createCheckoutSession(...): Promise<CheckoutSessionResult>;
  createCustomerPortal(customerId: string, returnUrl: string): Promise<string>;
  cancelSubscription(subscriptionId: string, atPeriodEnd?: boolean): Promise<void>;
  handleWebhook(rawBody: string | Buffer, signature: string): Promise<PaymentEvent>;
}
```

### Componentes Core

1. **`PaymentEngine` (El Controlador)**
   - Inyecta el proveedor correspondiente (ej. `StripeProvider` o `RedsysProvider`).
   - Expone métodos agnósticos como `provisionCustomer()` o `processWebhook()`.

2. **Eventos Normalizados (`PaymentEvent`)**
   - No importa si Stripe envía `customer.subscription.created` o Redsys envía un código SOAP. El proveedor lo traduce a un evento interno único: `SUBSCRIPTION_CREATED`.
   - La API recibe el `PaymentEvent` y actualiza la tabla `Subscription` en Prisma, sin saber de dónde viene.

3. **El Motor de Planes y FeatureGuard**
   - Los planes (`Plan`) y sus límites (`PlanFeature`) viven en **nuestra base de datos**.
   - Stripe solo se utiliza como un procesador de pagos (pasándole un `priceId`), pero la lógica de qué incluye ese precio (ej. 1000 mensajes) la controla Prisma.
   - El middleware `FeatureGuard.canExecute('conversations', 1)` lee la tabla `Consumption` y la compara con los límites del `Plan` asignado.

## ¿Cómo Integrar Redsys?

Si en el futuro se desea usar Redsys:
1. Crea un archivo `src/billing/providers/RedsysProvider.ts` que implemente la interfaz `IPaymentProvider`.
2. Utiliza el SDK de Redsys o llamadas REST para cumplir con las funciones.
3. En la función `handleWebhook`, parsea el XML/JSON de Redsys y retorna objetos `PaymentEvent` estándar.
4. En `PaymentEngine.ts`, añade:
   ```typescript
   if (process.env.PAYMENT_PROVIDER === 'REDSYS') {
     this.provider = new RedsysProvider();
   }
   ```
5. **Listo.** No hay que tocar ni una sola línea de Prisma, de validación de límites, ni el frontend de Next.js.
