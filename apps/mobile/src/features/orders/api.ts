import type { IApiResponse } from '@celebs/shared-types';

import { mapOrder } from './utils/order-mappers';
import type { OrderView } from './utils/order-status';
import { PAGE_SIZE, type RawOrder } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const ORDER_QUERY_KEYS = {
  all: ['orders'] as const,
  lists: () => [...ORDER_QUERY_KEYS.all, 'list'] as const,
  myOrders: (page?: number) =>
    [...ORDER_QUERY_KEYS.lists(), 'my-orders', { page: page ?? 1 }] as const,
  details: () => [...ORDER_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ORDER_QUERY_KEYS.details(), id] as const,
};

export async function getMyOrders(page = 1, limit = PAGE_SIZE): Promise<OrderView[]> {
  const payload = await handleApiResponse(
    apiClient.get<IApiResponse<{ orders?: RawOrder[]; total?: number }>>('/orders/my-orders', {
      params: { page, limit },
    }),
  );
  const orders = Array.isArray(payload?.orders) ? payload.orders : [];
  return orders.map((order) => mapOrder(order));
}

export async function getOrderById(orderId: string): Promise<OrderView> {
  const raw = await handleApiResponse(
    apiClient.get<IApiResponse<RawOrder>>(`/orders/my-orders/${orderId}`),
  );
  return mapOrder(raw);
}

export async function cancelOrderApi(orderId: string): Promise<void> {
  await apiClient.post(`/orders/my-orders/${orderId}/cancel`);
}
