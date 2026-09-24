export interface OrderItemInput {
  name: string;
  quantity: number;
  price?: number | undefined;
  notes?: string | undefined;
}

export interface CreateOrderParams {
  commerceId: string;
  sessionId?: string | undefined;
  customerName?: string | undefined;
  customerPhone: string;
  deliveryType: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: string | undefined;
  pickupTime?: string | undefined;
  items: OrderItemInput[];
  notes?: string | undefined;
}

export interface OrderResult {
  success: boolean;
  orderId: string;
  orderNumber?: string | undefined;
  totalAmount?: number | undefined;
  source: 'MANUAL' | 'WOOCOMMERCE' | 'SHOPIFY';
  message: string;
}

export interface IOrderProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  getCatalog?(commerceId: string): Promise<any[]>;
}
