import type { Banner, CampaignData, ComboBundleData } from './types';

import { apiClient } from '@/api/client';

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
  const response = await apiClient.get('/banners', { skipAuth: true });
  const resData = response.data;
  if (resData.success && Array.isArray(resData.data)) {
    return resData.data;
  }
  return [];
}

export async function getActiveCampaigns(): Promise<CampaignData[]> {
  const response = await apiClient.get<{ success: boolean; data: CampaignData[] }>(
    '/campaigns/active',
    { skipAuth: true },
  );
  if (response.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
}

export async function getCombos(tag?: string): Promise<ComboBundleData[]> {
  const params: Record<string, unknown> = {};
  if (tag) params.tag = tag;

  const response = await apiClient.get<{ success: boolean; data: ComboBundleData[] }>('/combos', {
    params,
    skipAuth: true,
  });
  if (response.data?.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return [];
}
