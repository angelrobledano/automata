"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWooCommerceOrder = createWooCommerceOrder;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("../utils/crypto");
async function createWooCommerceOrder(wooUrl, consumerKey, consumerSecret, orderData) {
    try {
        const url = `${wooUrl}/wp-json/wc/v3/orders`;
        const auth = Buffer.from(`${(0, crypto_1.decrypt)(consumerKey)}:${(0, crypto_1.decrypt)(consumerSecret)}`).toString('base64');
        // WooCommerce espera un array de line_items. Para la v1.0, enviaremos los items como una nota global o 
        // intentaremos mapearlos si conocemos el ID. Aquí lo simplificaremos añadiendo los detalles a las notas del cliente.
        const payload = {
            payment_method: "bacs",
            payment_method_title: "Pago en Tienda (IA)",
            set_paid: false,
            billing: {
                first_name: orderData.customer_name,
                phone: orderData.customer_phone,
            },
            customer_note: `--- PEDIDO IA ---\nArtículos: ${orderData.items.join(', ')}\nRecogida: ${orderData.pickup_time}\nNotas extra: ${orderData.notes}`,
            line_items: [
                // Idealmente aquí buscaríamos el ID del producto en Woo, pero para el MVP usaremos un producto genérico o notas.
                {
                    name: 'Pedido Personalizado WhatsApp',
                    quantity: 1,
                    total: "0.00" // El comercio ajustará el precio o se lo dirá al cliente en la recogida
                }
            ]
        };
        const response = await axios_1.default.post(url, payload, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            timeout: 10000, // SRE: 10 segundos máximo para evitar deadlocks en BullMQ
        });
        console.log(`[WooCommerce] Pedido creado con ID: ${response.data.id}`);
        return response.data.id;
    }
    catch (error) {
        console.error(`[WooCommerce] Error creando pedido:`, error.response?.data || error.message);
        throw new Error('No se pudo crear el pedido en WooCommerce.');
    }
}
//# sourceMappingURL=woocommerce.js.map