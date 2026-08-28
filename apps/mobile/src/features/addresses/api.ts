import type { AddressDraft, SavedAddress } from './types';

import { apiClient } from '@/api/client';

export const ADDRESS_QUERY_KEYS = {
  all: ['addresses'] as const,
  lists: () => [...ADDRESS_QUERY_KEYS.all, 'list'] as const,
  list: () => [...ADDRESS_QUERY_KEYS.lists()] as const,
  details: () => [...ADDRESS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ADDRESS_QUERY_KEYS.details(), id] as const,
};

export async function getAddresses(): Promise<SavedAddress[]> {
  const response = await apiClient.get<{ data?: SavedAddress[] }>('/orders/addresses');
  return response.data?.data ?? [];
}

export async function createAddressApi(draft: AddressDraft): Promise<SavedAddress> {
  const response = await apiClient.post<{ data?: SavedAddress }>('/orders/addresses', draft);
  if (!response.data?.data) {
    throw new Error('Failed to save address');
  }
  return response.data.data;
}

export async function updateAddressApi(
  addressId: string,
  draft: Partial<AddressDraft>,
): Promise<SavedAddress> {
  const response = await apiClient.patch<{ data?: SavedAddress }>(
    `/orders/addresses/${addressId}`,
    draft,
  );
  if (!response.data?.data) {
    throw new Error('Failed to update address');
  }
  return response.data.data;
}

export async function deleteAddressApi(addressId: string): Promise<void> {
  await apiClient.delete(`/orders/addresses/${addressId}`);
}
