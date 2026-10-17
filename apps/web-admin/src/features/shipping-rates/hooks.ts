import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type DeliveryCity,
  type DeliveryCityPatch,
  SHIPPING_RATE_QUERY_KEYS,
  type ShippingRate,
  ShippingRateApi,
  type ShippingRateInput,
  type ShippingRatePatch,
} from './api';

/**
 * Hooks for the rate card screen.
 *
 * Every mutation invalidates through the key factory, so a saved fee shows up
 * everywhere it is read without a global cache reset.
 */

export function useShippingRates() {
  return useQuery({
    queryKey: SHIPPING_RATE_QUERY_KEYS.rates(),
    queryFn: ShippingRateApi.getRates,
  });
}

export function useDeliveryCities() {
  return useQuery({
    queryKey: SHIPPING_RATE_QUERY_KEYS.cities(),
    queryFn: ShippingRateApi.getCities,
  });
}

export function useCreateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ShippingRateInput) => ShippingRateApi.createRate(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIPPING_RATE_QUERY_KEYS.lists() }),
  });
}

export function useUpdateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ShippingRatePatch }) =>
      ShippingRateApi.updateRate(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIPPING_RATE_QUERY_KEYS.lists() }),
  });
}

export function useDeleteShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ShippingRateApi.deleteRate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIPPING_RATE_QUERY_KEYS.lists() }),
  });
}

export function useUpdateDeliveryCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DeliveryCityPatch }) =>
      ShippingRateApi.updateCity(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SHIPPING_RATE_QUERY_KEYS.lists() }),
  });
}

export type { DeliveryCity, ShippingRate };
