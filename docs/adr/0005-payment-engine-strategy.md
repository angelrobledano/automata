# ADR: Desacoplamiento del Proveedor de Pagos (Strategy Pattern)

## Contexto
El sistema necesita cobrar suscripciones y excedentes a los clientes B2B. Tradicionalmente esto se acopla directamente a Stripe. Sin embargo, nuestro negocio planea expandirse y ofrecer alternativas locales más económicas en el futuro (como Redsys en España o MercadoPago en LATAM).

## Decisión
Hemos decidido **no utilizar** variables ni tablas dependientes de Stripe (`stripeCustomerId`, etc.). En su lugar, hemos implementado el **Patrón Strategy (Adapter)** mediante una clase central `PaymentEngine` y una interfaz estricta `IPaymentProvider`.

```typescript
export interface IPaymentProvider {
  createCustomer(commerceId: string, email: string, name: string): Promise<BillingCustomer>;
  createCheckoutSession(...): Promise<CheckoutSessionResult>;
  cancelSubscription(...): Promise<void>;
  handleWebhook(rawBody: string | Buffer, signature: string): Promise<PaymentEvent>;
}
```

### Consecuencias Positivas
- **Cero Vendor Lock-in**: Cambiar a Redsys requerirá 0 cambios en el modelo Prisma y 0 cambios en la lógica del Worker o el Dashboard.
- **TDD Facilitado**: Podemos crear un `MockPaymentProvider` in-memory para los tests End-to-End sin golpear la API real de Stripe.
- **Planes Dinámicos**: La configuración de los límites de cada plan vive en nuestra BD, no en el catálogo de productos de Stripe, permitiéndonos crear planes personalizados instantáneamente.

### Consecuencias Negativas
- Añade una capa extra de indirección.
- Requiere mapear manualmente los Webhooks de cada proveedor a un formato interno normalizado (`PaymentEvent`).
