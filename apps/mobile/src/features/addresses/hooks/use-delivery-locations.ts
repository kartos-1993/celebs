import { useQuery } from '@tanstack/react-query';

import { ADDRESS_QUERY_KEYS, getDeliveryLocations } from '../api';

export const DELIVERY_LOCATIONS_QUERY_KEY = ADDRESS_QUERY_KEYS.deliveryLocations();
export const fetchDeliveryLocations = getDeliveryLocations;

export function useDeliveryLocations() {
  return useQuery({
    queryKey: ADDRESS_QUERY_KEYS.deliveryLocations(),
    queryFn: getDeliveryLocations,
    staleTime: 10 * 60 * 1000,
  });
}
