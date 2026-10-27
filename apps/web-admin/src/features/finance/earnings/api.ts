import type { IApiResponse, IPaginatedApiResponse } from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';

/**
 * A seller's own earnings.
 *
 * Every money figure is a string, so a paisa survives the trip to the screen.
 * Rendered through the shared `formatMoneyAmount` rather than a local helper, so
 * this page and the courier ledger cannot disagree about how a figure looks.
 */

export interface EarningsSummary {
  grossSales: string;
  commission: string;
  deliveryCosts: string;
  refunds: string;
  /** Gross less commission and refunds. Derived, never multiplied by a rate. */
  netEarnings: string;
  currency: string;
}

export interface EarningsEntry {
  id: string;
  type: string;
  direction: 'IN' | 'OUT';
  amount: string;
  currency: string;
  courier: string | null;
  memo: string | null;
  orderId: string | null;
  vendorId: string | null;
  occurredAt: string;
}

export interface OrderEarningsItem {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  orderStatus: string;
  itemCount: number;
  grossSales: string;
  commission: string;
  vatOnCommission: string;
  netEarnings: string;
  refunds: string;
  refundStatus: 'NONE' | 'PARTIAL' | 'FULL';
  creditNoteAvailable: boolean;
  currency: string;
}

export type EarningsSummaryResponse = IApiResponse<{ summary: EarningsSummary }>;
export type EarningsListResponse = IPaginatedApiResponse<EarningsEntry>;
export type OrderEarningsListResponse = IPaginatedApiResponse<OrderEarningsItem>;

export const EARNINGS_QUERY_KEYS = {
  all: ['earnings'] as const,
  summary: () => [...EARNINGS_QUERY_KEYS.all, 'summary'] as const,
  list: (filters?: { page?: number; limit?: number }) =>
    [...EARNINGS_QUERY_KEYS.all, 'list', filters ?? {}] as const,
  orders: (filters?: { page?: number; limit?: number; from?: string; to?: string }) =>
    [...EARNINGS_QUERY_KEYS.all, 'orders', filters ?? {}] as const,
};

export const EarningsApi = {
  async getSummary(): Promise<EarningsSummaryResponse> {
    const response = await axiosClient.get<EarningsSummaryResponse>('/finance/earnings/summary');

    return response.data;
  },

  async listEntries({
    page = 1,
    limit = 25,
  }: { page?: number; limit?: number } = {}): Promise<EarningsListResponse> {
    const response = await axiosClient.get<EarningsListResponse>('/finance/earnings', {
      params: { page, limit },
    });

    return response.data;
  },

  async listOrders({
    page = 1,
    limit = 25,
    from,
    to,
  }: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  } = {}): Promise<OrderEarningsListResponse> {
    const response = await axiosClient.get<OrderEarningsListResponse>('/finance/earnings/orders', {
      params: { page, limit, from, to },
    });

    return response.data;
  },
};
