import type { IApiResponse } from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';

/**
 * The platform commission rate.
 *
 * Every money figure is a string, not a number: a rate of 7.5% is multiplied
 * against rupees downstream and a JSON number would put a float into the one
 * calculation a seller is paid from. `formatMoneyAmount` renders it.
 */

export type CommissionScope = 'GLOBAL' | 'CATEGORY' | 'VENDOR';

export interface CommissionRule {
  id: string;
  scope: CommissionScope;
  categoryId: string | null;
  vendorId: string | null;
  /** Percentage to two decimals: "7.50" means seven and a half percent. */
  ratePercent: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  label: string | null;
  description: string | null;
}

export interface CommissionOverview {
  current: CommissionRule[];
  history: CommissionRule[];
  maxPercent: string;
}

export interface SetCommissionRateInput {
  scope: CommissionScope;
  ratePercent: string;
  categoryId?: string;
  vendorId?: string;
  label?: string;
  description?: string;
}

export interface CommissionQuote {
  listPrice: string;
  commission: string;
  sellerNet: string;
  ratePercent: string;
}

export type CommissionOverviewResponse = IApiResponse<CommissionOverview>;
export type CommissionQuoteResponse = IApiResponse<CommissionQuote>;
export type CommissionHistoryResponse = IApiResponse<CommissionRule[]>;
export type SetCommissionRateResponse = IApiResponse<CommissionRule>;

export const COMMISSION_QUERY_KEYS = {
  all: ['finance-commission'] as const,
  overview: () => [...COMMISSION_QUERY_KEYS.all, 'overview'] as const,
  quoteRate: () => [...COMMISSION_QUERY_KEYS.all, 'quote', 'current-rate'] as const,
  history: () => [...COMMISSION_QUERY_KEYS.all, 'history'] as const,
};

export const CommissionApi = {
  async getOverview(): Promise<CommissionOverviewResponse> {
    const response = await axiosClient.get<CommissionOverviewResponse>('/finance/commissions');

    return response.data;
  },

  /**
   * "I want to keep Rs 900" -> "list at Rs 972.97".
   *
   * A GET with a body in the query string, because it is a pure read: it reveals
   * nothing but arithmetic, and a POST would make the browser attach a CSRF
   * token for a calculation.
   */
  async quote(desiredNet: string): Promise<CommissionQuoteResponse> {
    const response = await axiosClient.get<CommissionQuoteResponse>('/finance/commissions/quote', {
      params: { desiredNet },
    });

    return response.data;
  },

  async setRate(payload: SetCommissionRateInput): Promise<SetCommissionRateResponse> {
    const response = await axiosClient.post<SetCommissionRateResponse>(
      '/finance/commissions',
      payload,
    );

    return response.data;
  },
};
