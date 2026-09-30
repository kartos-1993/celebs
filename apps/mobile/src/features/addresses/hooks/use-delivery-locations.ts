import { useQuery } from '@tanstack/react-query';

import type { DeliveryLocationsResponse, IApiResponse } from '@celebs/shared-types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

/**
 * The districts and areas we actually deliver to.
 *
 * Fetched from the server rather than bundled, so the address form always offers
 * the current list: a district a courier drops disappears here rather than
 * letting a customer fill in an address that checkout will refuse.
 */
export const DELIVERY_LOCATIONS_QUERY_KEY = ['delivery-locations'] as const;

export async function fetchDeliveryLocations(): Promise<DeliveryLocationsResponse> {
  return handleApiResponse<DeliveryLocationsResponse>(
    apiClient.get<IApiResponse<DeliveryLocationsResponse>>('/logistics/delivery-locations', {
      skipAuth: true,
    }),
  );
}

export function useDeliveryLocations() {
  return useQuery({
    queryKey: DELIVERY_LOCATIONS_QUERY_KEY,
    queryFn: fetchDeliveryLocations,
    // Long enough that opening the form twice does not re-request, short enough
    // that a coverage change is picked up within a session.
    staleTime: 10 * 60 * 1000,
  });
}
