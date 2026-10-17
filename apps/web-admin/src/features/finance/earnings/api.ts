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

export type EarningsSummaryResponse = IApiResponse<{ summary: EarningsSummary }>;
export type EarningsListResponse = IPaginatedApiResponse<EarningsEntry>;

export const EARNINGS_QUERY_KEYS = {
  all: ['earnings'] as const,
  summary: () => [...EARNINGS_QUERY_KEYS.all, 'summary'] as const,
  list: (filters?: { page?: number; limit?: number }) =>
    [...EARNINGS_QUERY_KEYS.all, 'list', filters ?? {}] as const,
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
};
