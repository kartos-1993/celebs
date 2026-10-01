import type { IApiResponse } from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';

/**
 * Admin management of the delivery rate card.
 *
 * Co-located with the feature rather than a global key file, and every screen
 * goes through these functions so no component talks to the API directly.
 */

export interface ShippingRate {
  id: string;
  /** Null means the band applies to every city. */
  cityId: string | null;
  cityName: string | null;
  cityProvince: string | null;
  minWeightKg: string;
  maxWeightKg: string;
  fee: string;
  codFee: string;
  isActive: boolean;
}

export interface DeliveryCity {
  id: string;
  name: string;
  province: string;
  isValley: boolean;
  /** Decimal on the wire, so paisa survives: see the rate band fields above. */
  freeDeliveryThreshold: string;
  isActive: boolean;
  source: string;
}

export interface ShippingRateInput {
  cityId: string | null;
  minWeightKg: number;
  maxWeightKg: number;
  fee: number;
  codFee: number;
  isActive?: boolean;
}

export interface ShippingRatePatch {
  cityId?: string | null;
  minWeightKg?: number;
  maxWeightKg?: number;
  fee?: number;
  codFee?: number;
  isActive?: boolean;
}

export interface DeliveryCityPatch {
  freeDeliveryThreshold?: number;
  isActive?: boolean;
}

export const SHIPPING_RATE_QUERY_KEYS = {
  all: ['shipping-rates'] as const,
  lists: () => [...SHIPPING_RATE_QUERY_KEYS.all, 'list'] as const,
  rates: () => [...SHIPPING_RATE_QUERY_KEYS.lists(), 'rates'] as const,
  cities: () => [...SHIPPING_RATE_QUERY_KEYS.lists(), 'cities'] as const,
};

/**
 * The envelope's  is typed nullable, so a 200 with no body would otherwise be
 * handed on as a real list and blow up three components later. Fail here instead.
 */
const unwrap = <T>(response: { data: IApiResponse<T> }): T => {
  const payload = response.data?.data;
  if (payload === null || payload === undefined) {
    throw new Error(response.data?.message ?? 'The server returned no data.');
  }

  return payload;
};

export const ShippingRateApi = {
  async getRates(): Promise<ShippingRate[]> {
    return unwrap(await axiosClient.get<IApiResponse<ShippingRate[]>>('/logistics/shipping-rates'));
  },

  async getCities(): Promise<DeliveryCity[]> {
    return unwrap(
      await axiosClient.get<IApiResponse<DeliveryCity[]>>('/logistics/delivery-cities'),
    );
  },

  async createRate(payload: ShippingRateInput): Promise<ShippingRate> {
    return unwrap(
      await axiosClient.post<IApiResponse<ShippingRate>>('/logistics/shipping-rates', payload),
    );
  },

  async updateRate(id: string, payload: ShippingRatePatch): Promise<ShippingRate> {
    return unwrap(
      await axiosClient.patch<IApiResponse<ShippingRate>>(
        `/logistics/shipping-rates/${id}`,
        payload,
      ),
    );
  },

  async deleteRate(id: string): Promise<{ id: string }> {
    return unwrap(
      await axiosClient.delete<IApiResponse<{ id: string }>>(`/logistics/shipping-rates/${id}`),
    );
  },

  async updateCity(id: string, payload: DeliveryCityPatch): Promise<DeliveryCity> {
    return unwrap(
      await axiosClient.patch<IApiResponse<DeliveryCity>>(`/logistics/delivery-cities/${id}`, {
        ...payload,
      }),
    );
  },
};
