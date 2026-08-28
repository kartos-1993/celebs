import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ADDRESS_QUERY_KEYS,
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from '../api';
import type { AddressDraft } from '../types';

import { useAuth } from '@/features/auth/context/auth-context';

export { ADDRESS_QUERY_KEYS } from '../api';
export const ADDRESSES_QUERY_KEY = ADDRESS_QUERY_KEYS.all;

export function useAddresses(enabled: boolean = true) {
  const { isLoggedIn, isLoading } = useAuth();
  const shouldEnable = Boolean(enabled && isLoggedIn && !isLoading);

  const query = useQuery({
    queryKey: ADDRESS_QUERY_KEYS.list(),
    queryFn: getAddresses,
    enabled: shouldEnable,
    staleTime: 1000 * 60,
  });

  return {
    addresses: query.data ?? [],
    loading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: AddressDraft) => createAddress(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, draft }: { addressId: string; draft: Partial<AddressDraft> }) =>
      updateAddress(addressId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
}
