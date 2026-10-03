import type { IApiResponse, IPaginatedApiResponse } from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';

/**
 * The platform's courier ledger and the settlements agreed against it.
 *
 * Co-located with the feature, and every screen goes through these functions so no
 * component talks to the API directly.
 *
 * Every money field is a string, never a number. See ../lib/money for why that is
 * not pedantry.
 */

export type LedgerDirection = 'IN' | 'OUT';

export type SettlementStatus = 'OPEN' | 'RECONCILED' | 'PAID';

export interface LedgerEntry {
  id: string;
  type: string;
  direction: LedgerDirection;
  amount: string;
  currency: string;
  courier: string | null;
  memo: string | null;
  orderId: string | null;
  occurredAt: string;
}

export interface SettlementBatch {
  id: string;
  courier: string;
  status: SettlementStatus;
  periodStart: string;
  periodEnd: string;
  expectedCollected: string;
  expectedFees: string;
  declaredCollected: string;
  declaredFees: string;
  variance: string;
  reference: string | null;
  notes: string | null;
  reconciledAt: string | null;
  paidAt: string | null;
}

export interface LedgerFilters {
  courier?: string;
  type?: string;
  from?: string;
  to?: string;
}

export interface SettlementFilters {
  courier?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
}

export interface LedgerListParams extends ListParams, LedgerFilters {}

export interface SettlementListParams extends ListParams, SettlementFilters {}

/**
 * A statement, a transition, or both - which is what PATCH /settlements/:id takes.
 *
 * Half a statement is not offered: declaredCollected without declaredFees is
 * rejected server-side, because defaulting the missing half to zero would invent
 * a claim the courier never made.
 */
export interface SettlementUpdate {
  declaredCollected?: number;
  declaredFees?: number;
  reference?: string;
  notes?: string;
  status?: Extract<SettlementStatus, 'RECONCILED' | 'PAID'>;
}

export type LedgerListResponse = IPaginatedApiResponse<LedgerEntry>;
export type SettlementListResponse = IPaginatedApiResponse<SettlementBatch>;
export type OpenBatchResponse = IApiResponse<SettlementBatch>;
export type UpdateBatchResponse = IApiResponse<SettlementBatch>;

export const FINANCE_QUERY_KEYS = {
  all: ['finance'] as const,
  lists: () => [...FINANCE_QUERY_KEYS.all, 'list'] as const,
  ledger: (filters?: LedgerFilters & ListParams) =>
    [...FINANCE_QUERY_KEYS.lists(), 'ledger', filters ?? {}] as const,
  settlements: (filters?: SettlementFilters & ListParams) =>
    [...FINANCE_QUERY_KEYS.lists(), 'settlements', filters ?? {}] as const,
};

export const FinanceApi = {
  async getLedgerEntries({
    page = 1,
    limit = 25,
    courier,
    type,
    from,
    to,
  }: LedgerListParams = {}): Promise<LedgerListResponse> {
    const response = await axiosClient.get<LedgerListResponse>('/finance/ledger', {
      params: {
        page,
        limit,
        ...(courier ? { courier } : {}),
        ...(type ? { type } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      },
    });

    return response.data;
  },

  async getSettlementBatches({
    page = 1,
    limit = 25,
    courier,
  }: SettlementListParams = {}): Promise<SettlementListResponse> {
    const response = await axiosClient.get<SettlementListResponse>('/finance/settlements', {
      params: { page, limit, ...(courier ? { courier } : {}) },
    });

    return response.data;
  },

  async openBatch(payload: {
    courier: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<OpenBatchResponse> {
    const response = await axiosClient.post<OpenBatchResponse>('/finance/settlements', payload);

    return response.data;
  },

  async updateBatch(id: string, payload: SettlementUpdate): Promise<UpdateBatchResponse> {
    const response = await axiosClient.patch<UpdateBatchResponse>(
      `/finance/settlements/${id}`,
      payload,
    );

    return response.data;
  },
};
