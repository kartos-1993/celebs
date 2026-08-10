import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { StorefrontConfigData } from '../types';

export function useStorefrontConfig(categorySlug: string) {
  const fetchStorefrontConfig = async (): Promise<StorefrontConfigData | null> => {
    if (!categorySlug) return null;
    const response = await apiClient.get(`/category/${categorySlug}/storefront`, {
      skipAuth: true,
    });
    const resData = response.data;
    if (resData.success && resData.data) {
      return resData.data as StorefrontConfigData;
    }
    return null;
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['storefront-config', categorySlug],
    queryFn: fetchStorefrontConfig,
    enabled: !!categorySlug,
    staleTime: __DEV__ ? 0 : 1000 * 60 * 5, // 0s in dev for instant updates, 5 mins in prod
  });

  return {
    storefrontConfig: data,
    loading: isLoading,
    isError,
    refetch,
  };
}
