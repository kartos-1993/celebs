import type { IApiResponse, UpdateOrderItemStatusInput } from '@celebs/shared-types';

import type { AdminOrderDto, LogisticsProvider, VendorOrderItemDto } from './types';

import { axiosClient } from '@/lib/axios/axios-client';

export const ORDERS_QUERY_KEYS = {
  all: ['orders'] as const,
  vendor: (filters: { status?: string; page: number; limit: number }) =>
    [...ORDERS_QUERY_KEYS.all, 'vendor', filters] as const,
  admin: (filters: { status?: string; page: number; limit: number }) =>
    [...ORDERS_QUERY_KEYS.all, 'admin', filters] as const,
};

export interface OrdersListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface VendorOrdersPayload {
  items: VendorOrderItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminOrdersPayload {
  orders: AdminOrderDto[];
  total: number;
  page: number;
  limit: number;
}

export type VendorOrdersResponse = IApiResponse<VendorOrdersPayload>;
export type AdminOrdersResponse = IApiResponse<AdminOrdersPayload>;
export type UpdateOrderItemStatusResponse = IApiResponse<VendorOrderItemDto>;

export async function getVendorOrders({
  status,
  page = 1,
  limit = 10,
}: OrdersListParams): Promise<VendorOrdersResponse> {
  const response = await axiosClient.get<VendorOrdersResponse>('/orders/vendor/orders', {
    params: { ...(status ? { status } : {}), page, limit },
  });
  return response.data;
}

export async function getAdminOrders({
  status,
  page = 1,
  limit = 10,
}: OrdersListParams): Promise<AdminOrdersResponse> {
  const response = await axiosClient.get<AdminOrdersResponse>('/orders/admin/orders', {
    params: { ...(status ? { status } : {}), page, limit },
  });
  return response.data;
}

export async function updateOrderItemStatusApi(
  orderItemId: string,
  body: UpdateOrderItemStatusInput,
): Promise<UpdateOrderItemStatusResponse> {
  const response = await axiosClient.patch<UpdateOrderItemStatusResponse>(
    `/orders/vendor/orders/items/${orderItemId}/status`,
    body,
  );
  return response.data;
}

// --- Logistics endpoints ---

export interface Dispatch3PLParams {
  orderId: string;
  provider?: LogisticsProvider;
}

export interface SettleCodParams {
  orderId: string;
  reference: string;
}

export interface Dispatch3PLPayload {
  trackingNumber?: string;
  provider?: string;
}

export type Dispatch3PLResponse = IApiResponse<Dispatch3PLPayload>;
export type SettleCodResponse = IApiResponse<unknown>;

export async function dispatch3PLOrder({
  orderId,
  provider = 'NEPAL_CAN_MOVE',
}: Dispatch3PLParams): Promise<Dispatch3PLResponse> {
  const response = await axiosClient.post<Dispatch3PLResponse>(`/logistics/dispatch/${orderId}`, {
    provider,
  });
  return response.data;
}

export async function settleCodOrder({
  orderId,
  reference,
}: SettleCodParams): Promise<SettleCodResponse> {
  const response = await axiosClient.post<SettleCodResponse>(`/logistics/settle-cod/${orderId}`, {
    reference,
  });
  return response.data;
}
