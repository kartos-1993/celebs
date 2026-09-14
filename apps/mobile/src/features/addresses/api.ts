import type { IApiResponse } from '@celebs/shared-types';

import type { AddressDraft, SavedAddress } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const ADDRESS_QUERY_KEYS = {
  all: ['addresses'] as const,
  lists: () => [...ADDRESS_QUERY_KEYS.all, 'list'] as const,
  list: () => [...ADDRESS_QUERY_KEYS.lists()] as const,
  details: () => [...ADDRESS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ADDRESS_QUERY_KEYS.details(), id] as const,
};

export async function getAddresses(): Promise<SavedAddress[]> {
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<SavedAddress[]>>('/orders/addresses'),
  );
  return Array.isArray(data) ? data : [];
}

export async function createAddress(draft: AddressDraft): Promise<SavedAddress> {
  return handleApiResponse(apiClient.post<IApiResponse<SavedAddress>>('/orders/addresses', draft));
}

export async function updateAddress(
  addressId: string,
  draft: Partial<AddressDraft>,
): Promise<SavedAddress> {
  return handleApiResponse(
    apiClient.patch<IApiResponse<SavedAddress>>(`/orders/addresses/${addressId}`, draft),
  );
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiClient.delete(`/orders/addresses/${addressId}`);
}

export const createAddressApi = createAddress;
export const updateAddressApi = updateAddress;
export const deleteAddressApi = deleteAddress;
