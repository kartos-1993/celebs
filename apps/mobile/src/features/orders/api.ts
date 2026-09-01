import { mapOrder } from './utils/order-mappers';
import type { OrderView } from './utils/order-status';
import { type MyOrdersResponse, PAGE_SIZE, type RawOrder } from './types';

import { apiClient } from '@/api/client';

export const ORDER_QUERY_KEYS = {
  all: ['orders'] as const,
  lists: () => [...ORDER_QUERY_KEYS.all, 'list'] as const,
  myOrders: (page?: number) =>
    [...ORDER_QUERY_KEYS.lists(), 'my-orders', { page: page ?? 1 }] as const,
  details: () => [...ORDER_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORDER_QUERY_KEYS.details(), id] as const,
};

export async function getMyOrders(page = 1, limit = PAGE_SIZE): Promise<OrderView[]> {
  const response = await apiClient.get<MyOrdersResponse>('/orders/my-orders', {
    params: { page, limit },
  });
  const payload = response.data?.data;
  const orders = Array.isArray(payload?.orders) ? payload.orders : [];
  return orders.map((order) => mapOrder(order));
}

export async function getOrderById(orderId: string): Promise<OrderView> {
  const response = await apiClient.get<{ data?: RawOrder }>(`/orders/my-orders/${orderId}`);
  if (!response.data?.data) {
    throw new Error('Order not found');
  }
  return mapOrder(response.data.data);
}
