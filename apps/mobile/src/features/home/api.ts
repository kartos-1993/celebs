import type { IApiResponse } from '@celebs/shared-types';

import type { Banner, CampaignData, ComboBundleData } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const BANNER_QUERY_KEYS = {
  all: ['banners'] as const,
  list: () => [...BANNER_QUERY_KEYS.all, 'list'] as const,
};

export const CAMPAIGN_QUERY_KEYS = {
  all: ['campaigns'] as const,
  active: () => [...CAMPAIGN_QUERY_KEYS.all, 'active'] as const,
  detail: (idOrSlug: string) => [...CAMPAIGN_QUERY_KEYS.all, 'detail', idOrSlug] as const,
};

export const COMBO_QUERY_KEYS = {
  all: ['combos'] as const,
  list: (tag?: string) => [...COMBO_QUERY_KEYS.all, 'list', { tag }] as const,
  detail: (idOrSlug: string) => [...COMBO_QUERY_KEYS.all, 'detail', idOrSlug] as const,
};

export async function getBanners(): Promise<Banner[]> {
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<Banner[]>>('/banners', { skipAuth: true }),
  );
  return Array.isArray(data) ? data : [];
}

export async function getActiveCampaigns(): Promise<CampaignData[]> {
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<CampaignData[]>>('/campaigns/active', { skipAuth: true }),
  );
  return Array.isArray(data) ? data : [];
}

export async function getCombos(tag?: string): Promise<ComboBundleData[]> {
  const params: Record<string, unknown> = {};
  if (tag) params.tag = tag;

  const data = await handleApiResponse(
    apiClient.get<IApiResponse<ComboBundleData[]>>('/combos', {
      params,
      skipAuth: true,
    }),
  );
  return Array.isArray(data) ? data : [];
}
