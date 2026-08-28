import type { OrderAddressView, OrderStatus } from './utils/order-status';

export interface RawOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string | number;
  shippingFee: string | number;
  discountAmount: string | number;
  totalAmount: string | number;
  courierProvider?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  items?: Record<string, unknown>[];
  address?: OrderAddressView | null;
  payments?: Record<string, unknown>[];
  trackingEvents?: Record<string, unknown>[];
}

export interface MyOrdersResponse {
  success?: boolean;
  data?: {
    orders?: RawOrder[];
    total?: number;
    page?: number;
    limit?: number;
  };
}

export const PAGE_SIZE = 10;
