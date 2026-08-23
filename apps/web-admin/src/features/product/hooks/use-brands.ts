import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrandFilterType, CreateBrandAuthorizationType } from '@celebs/shared-types';
import { useAuthContext } from '@/context/auth-provider';
import {
  getBrandById,
  getBrands,
  getMyBrandAuthorizations,
  submitBrandAuthorization,
} from '../brand-api';
import { BRAND_QUERY_KEYS } from '../brand-query-keys';

export function useBrands(filters?: Partial<BrandFilterType>) {
  return useQuery({
    queryKey: BRAND_QUERY_KEYS.list(filters),
    queryFn: () => getBrands(filters),
    select: (res) => res.data,
  });
}

export function useBrandDetail(id: string) {
  return useQuery({
    queryKey: BRAND_QUERY_KEYS.detail(id),
    queryFn: () => getBrandById(id),
    enabled: Boolean(id),
    select: (res) => res.data,
  });
}

export function useMyBrandAuthorizations() {
  const { isVendor, isStaff } = useAuthContext();


  return useQuery({
    queryKey: BRAND_QUERY_KEYS.myAuthorizations(),
    queryFn: getMyBrandAuthorizations,
    enabled: isVendor || isStaff,
    select: (res) => res?.data || [],
  });
}


export function useSubmitBrandAuthorization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBrandAuthorizationType) => submitBrandAuthorization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRAND_QUERY_KEYS.myAuthorizations() });
    },
  });
}
