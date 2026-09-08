import type { OrderView } from './order-status';

import { getApiBaseUrl } from '@/api/client';

export interface ActivePaymentSheet {
  paymentUrl: string;
  orderId: string;
  orderNumber: string;
  title: string;
}

export function buildOrderPaymentIntent(order: OrderView): ActivePaymentSheet {
  const isEsewa = order.paymentMethod === 'ESEWA';
  const formUrl = `${getApiBaseUrl()}/orders/payments/esewa/form/${order.id}`;
  return {
    paymentUrl: formUrl,
    orderId: order.id,
    orderNumber: order.orderNumber,
    title: isEsewa ? 'eSewa Mobile Wallet' : 'Online Payment',
  };
}
