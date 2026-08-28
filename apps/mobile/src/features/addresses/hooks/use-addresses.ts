import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ADDRESS_QUERY_KEYS,
  createAddressApi,
  deleteAddressApi,
  getAddresses,
  updateAddressApi,
} from '../api';
import type { AddressDraft } from '../types';

export { ADDRESS_QUERY_KEYS } from '../api';
export const ADDRESSES_QUERY_KEY = ADDRESS_QUERY_KEYS.all;

export function useAddresses(enabled: boolean) {
  const query = useQuery({
    queryKey: ADDRESS_QUERY_KEYS.list(),
    queryFn: getAddresses,
    enabled,
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
    mutationFn: (draft: AddressDraft) => createAddressApi(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ addressId, draft }: { addressId: string; draft: Partial<AddressDraft> }) =>
      updateAddressApi(addressId, draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => deleteAddressApi(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESS_QUERY_KEYS.all });
    },
  });
}
