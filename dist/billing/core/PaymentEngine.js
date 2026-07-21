"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentEngine = void 0;
const StripeProvider_1 = require("../providers/StripeProvider");
// En un entorno de Inversión de Dependencias (DI) real como NestJS o Inversify, 
// inyectaríamos la dependencia. Aquí usaremos un Factory o inyección simple en el constructor.
class PaymentEngine {
    provider;
    constructor(providerStr) {
        const selectedProvider = providerStr || process.env.PAYMENT_PROVIDER || 'STRIPE';
        if (selectedProvider === 'STRIPE') {
            this.provider = new StripeProvider_1.StripeProvider();
        }
        else {
            throw new Error(`Payment provider ${selectedProvider} is not supported yet.`);
        }
    }
    // Exposed Business Methods
    async provisionCustomer(commerceId, email, name) {
        return this.provider.createCustomer(commerceId, email, name);
    }
    async createSubscriptionCheckout(customerId, priceId, successUrl, cancelUrl) {
        return this.provider.createCheckoutSession(customerId, priceId, successUrl, cancelUrl);
    }
    async getCustomerPortal(customerId, returnUrl) {
        return this.provider.createCustomerPortal(customerId, returnUrl);
    }
    async cancelSubscription(subscriptionId) {
        return this.provider.cancelSubscription(subscriptionId, true); // default to end of period
    }
    /**
     * Processes an incoming webhook from the active provider.
     * Ensures idempotency and translates to internal domain events.
     */
    async processWebhook(rawBody, signature) {
        return this.provider.handleWebhook(rawBody, signature);
    }
}
exports.PaymentEngine = PaymentEngine;
//# sourceMappingURL=PaymentEngine.js.map