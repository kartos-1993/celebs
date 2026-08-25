import { useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

import type {
  OrderAddressView,
  OrderItemStatus,
  OrderItemView,
  OrderStatus,
  OrderTrackingEventView,
  OrderView,
} from '../utils/order-status';

const ORDERS_QUERY_KEY = ['my-orders'] as const;
const PAGE_SIZE = 10;

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

interface RawOrder {
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

function mapItem(raw: Record<string, unknown>): OrderItemView {
  return {
    id: String(raw.id),
    productName: String(raw.productName ?? 'Item'),
    colorVariantName: String(raw.colorVariantName ?? ''),
    size: String(raw.size ?? ''),
    quantity: toNumber(raw.quantity),
    unitPrice: toNumber(raw.unitPrice),
    subtotal: toNumber(raw.subtotal),
    itemStatus: (raw.itemStatus as OrderItemStatus) ?? 'PENDING',
    ...(raw.trackingNumber ? { trackingNumber: String(raw.trackingNumber) } : {}),
    ...(raw.courierPartner ? { courierPartner: String(raw.courierPartner) } : {}),
  };
}

function mapEvent(raw: Record<string, unknown>): OrderTrackingEventView {
  return {
    id: String(raw.id),
    status: (raw.status as OrderStatus) ?? 'CONFIRMED',
    title: String(raw.title ?? ''),
    description: raw.description ? String(raw.description) : null,
    location: raw.location ? String(raw.location) : null,
    source: String(raw.source ?? 'SYSTEM'),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
  };
}

export function mapOrder(raw: RawOrder): OrderView {
  const payments = (raw.payments ?? []).map((p) => ({
    id: String(p.id),
    amount: toNumber(p.amount),
    currency: String(p.currency ?? 'NPR'),
    gateway: String(p.gateway ?? raw.paymentMethod),
    status: String(p.status ?? 'PENDING'),
  }));

  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: raw.status,
    paymentMethod: raw.paymentMethod,
    paymentStatus: raw.paymentStatus,
    subtotal: toNumber(raw.subtotal),
    shippingFee: toNumber(raw.shippingFee),
    discountAmount: toNumber(raw.discountAmount),
    totalAmount: toNumber(raw.totalAmount),
    ...(raw.courierProvider ? { courierProvider: raw.courierProvider } : {}),
    ...(raw.courierName ? { courierName: raw.courierName } : {}),
    ...(raw.trackingNumber ? { trackingNumber: raw.trackingNumber } : {}),
    ...(raw.trackingUrl ? { trackingUrl: raw.trackingUrl } : {}),
    ...(raw.estimatedDelivery ? { estimatedDelivery: raw.estimatedDelivery } : {}),
    items: (raw.items ?? []).map(mapItem),
    address: raw.address
      ? {
          fullName: String(raw.address.fullName ?? ''),
          phone: String(raw.address.phone ?? ''),
          province: String(raw.address.province ?? ''),
          district: String(raw.address.district ?? ''),
          cityArea: String(raw.address.cityArea ?? ''),
          streetAddress: String(raw.address.streetAddress ?? ''),
          landmark: raw.address.landmark ? String(raw.address.landmark) : null,
        }
      : null,
    ...(payments.length > 0 ? { payments } : {}),
    ...(raw.trackingEvents ? { trackingEvents: raw.trackingEvents.map(mapEvent) } : {}),
  };
}

interface MyOrdersResponse {
  success?: boolean;
  data?: {
    orders?: RawOrder[];
    total?: number;
    page?: number;
    limit?: number;
  };
}

/** Paginated list of the signed-in user's orders */
export function useMyOrders(enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ORDERS_QUERY_KEY,
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam }: { pageParam: number }): Promise<OrderView[]> => {
      const response = await apiClient.get<MyOrdersResponse>('/orders/my-orders', {
        params: { page: pageParam, limit: PAGE_SIZE },
      });
      const payload = response.data?.data;
      const orders = Array.isArray(payload?.orders) ? payload.orders : [];
      return orders.map((order) => mapOrder(order));
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length + 1;
    },
    staleTime: 1000 * 15,
  });

  const orders = query.data?.pages.flat() ?? [];

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    orders,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    error: query.error?.message ?? null,
    refresh: query.refetch,
    loadMore,
  };
}

/** Single order with tracking events; polls every LIVE_POLL_INTERVAL_MS while active */
export const LIVE_POLL_INTERVAL_MS = 15000;

export function useOrderDetail(orderId: string, enabled: boolean, poll: boolean) {
  const query = useQuery({
    queryKey: ['order', orderId],
    enabled: enabled && !!orderId,
    queryFn: async (): Promise<OrderView> => {
      const response = await apiClient.get<{ data?: Record<string, unknown> }>(
        `/orders/my-orders/${orderId}`,
      );
      if (!response.data?.data) throw new Error('Order not found');
      return mapOrder(response.data.data as unknown as RawOrder);
    },
    refetchInterval: poll ? LIVE_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: poll ? 0 : 1000 * 30,
  });

  return {
    order: query.data ?? null,
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.error?.message ?? null,
    refresh: query.refetch,
  };
}

export function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
  }, [queryClient]);
}
