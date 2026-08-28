import { useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMyOrders, getOrderById, ORDER_QUERY_KEYS } from '../api';
import { PAGE_SIZE } from '../types';
import { isActiveOrder } from '../utils/order-status';

export { ORDER_QUERY_KEYS } from '../api';
export { mapOrder } from '../utils/order-mappers';

export const LIVE_POLL_INTERVAL_MS = 15000;
const PENDING_PAYMENT_POLL_MS = 30000;

/** Paginated list of the signed-in user's orders */
export function useMyOrders(enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ORDER_QUERY_KEYS.myOrders(),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }: { pageParam: number }) => getMyOrders(pageParam, PAGE_SIZE),
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

/**
 * Single order with tracking events.
 */
export function useOrderDetail(orderId: string, enabled: boolean) {
  const query = useQuery({
    queryKey: ORDER_QUERY_KEYS.detail(orderId),
    enabled: enabled && !!orderId,
    queryFn: () => getOrderById(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return LIVE_POLL_INTERVAL_MS;
      if (isActiveOrder(status)) return LIVE_POLL_INTERVAL_MS;
      if (status === 'PENDING_PAYMENT') return PENDING_PAYMENT_POLL_MS;
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
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
    queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
  }, [queryClient]);
}
