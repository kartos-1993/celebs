import { useQuery } from '@tanstack/react-query';

import {
  BANNER_QUERY_KEYS,
  CAMPAIGN_QUERY_KEYS,
  COMBO_QUERY_KEYS,
  getActiveCampaigns,
  getBanners,
  getCombos,
} from '../api';
import type { CampaignData, ComboBundleData } from '../types';

export function useBanners() {
  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: BANNER_QUERY_KEYS.list(),
    queryFn: getBanners,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  return {
    banners: data || [],
    loading,
    refetch,
  };
}

export function useActiveCampaign() {
  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: CAMPAIGN_QUERY_KEYS.active(),
    queryFn: getActiveCampaigns,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const activeCampaign: CampaignData | null = data && data.length > 0 ? data[0] : null;

  return {
    activeCampaign,
    loading,
    refetch,
  };
}

export function useCombos(tag?: string) {
  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery<ComboBundleData[]>({
    queryKey: COMBO_QUERY_KEYS.list(tag),
    queryFn: () => getCombos(tag),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    combos: data || [],
    loading,
    refetch,
  };
}
