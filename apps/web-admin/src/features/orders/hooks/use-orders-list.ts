import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  type AdminOrdersResponse,
  getAdminOrders,
  getVendorOrders,
  ORDERS_QUERY_KEYS,
  type VendorOrdersResponse,
} from '../api';
import { PAGE_LIMIT } from '../lib/order-constants';
import { mapAdminOrdersToRows, mapVendorItemsToRows } from '../lib/order-mappers';
import type { Mode } from '../types';

interface UseOrdersListParams {
  mode: Mode;
  activeTab: string;
  page: number;
  pageSize?: number;
  searchQuery: string;
}

export function useOrdersList({
  mode,
  activeTab,
  page,
  pageSize = PAGE_LIMIT,
  searchQuery,
}: UseOrdersListParams) {
  const statusParam = activeTab === 'ALL' ? undefined : activeTab;
  const queryParams = { status: statusParam, page, limit: pageSize };

  const listQuery = useQuery<VendorOrdersResponse | AdminOrdersResponse>({
    queryKey:
      mode === 'vendor'
        ? ORDERS_QUERY_KEYS.vendor(queryParams)
        : ORDERS_QUERY_KEYS.admin(queryParams),
    queryFn: () => (mode === 'vendor' ? getVendorOrders(queryParams) : getAdminOrders(queryParams)),
  });

  const rows = useMemo(() => {
    const data = listQuery.data;
    if (!data?.data) return [];
    return 'items' in data.data
      ? mapVendorItemsToRows(data.data.items)
      : mapAdminOrdersToRows(data.data.orders);
  }, [listQuery.data]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (ord) =>
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.productName.toLowerCase().includes(q) ||
        ord.cityArea.toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const total = listQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    filteredRows,
    total,
    totalPages,
    activeListKey:
      mode === 'vendor'
        ? ORDERS_QUERY_KEYS.vendor(queryParams)
        : ORDERS_QUERY_KEYS.admin(queryParams),
  };
}
