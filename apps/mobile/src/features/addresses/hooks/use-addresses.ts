import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';

import type { AddressDraft, SavedAddress } from '../types';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

export function useAddresses(enabled: boolean) {
  const query = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: async (): Promise<SavedAddress[]> => {
      const response = await apiClient.get<{ data?: SavedAddress[] }>('/orders/addresses');
      return response.data?.data ?? [];
    },
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
    mutationFn: async (draft: AddressDraft): Promise<SavedAddress> => {
      const response = await apiClient.post<{ data?: SavedAddress }>('/orders/addresses', draft);
      if (!response.data?.data) throw new Error('Failed to save address');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      addressId,
      draft,
    }: {
      addressId: string;
      draft: Partial<AddressDraft>;
    }): Promise<SavedAddress> => {
      const response = await apiClient.patch<{ data?: SavedAddress }>(
        `/orders/addresses/${addressId}`,
        draft,
      );
      if (!response.data?.data) throw new Error('Failed to update address');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addressId: string): Promise<void> => {
      await apiClient.delete(`/orders/addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}
