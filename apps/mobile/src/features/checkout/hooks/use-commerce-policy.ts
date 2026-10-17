import { useQuery } from '@tanstack/react-query';

import {
  COMMERCE_POLICY_DEFAULTS,
  type CommercePolicy,
  type IApiResponse,
  parseCommercePolicy,
} from '@celebs/shared-types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

/**
 * The commerce policy — COD ceiling, delivery fee, free-delivery threshold — as
 * the server currently has it.
 *
 * Read from the public settings endpoint so an admin's change reaches the app
 * without a release. The server remains the authority on money: this only lets
 * the app display a figure derived from the same rule the server charges with,
 * instead of one copied into the bundle.
 *
 * The shipped defaults stand in until the request resolves, and stay in place if
 * it fails, so a settings outage degrades to today's behaviour rather than to a
 * blank total.
 */
export const COMMERCE_POLICY_QUERY_KEY = ['commerce-policy'] as const;

interface PublicSettingsPayload {
  raw?: { key: string; value: string }[];
  parsed?: Record<string, unknown>;
}

export async function fetchCommercePolicy(): Promise<CommercePolicy> {
  const payload = await handleApiResponse<PublicSettingsPayload>(
    apiClient.get<IApiResponse<PublicSettingsPayload>>('/settings/public', { skipAuth: true }),
  );

  if (!payload) return { ...COMMERCE_POLICY_DEFAULTS };

  return parseCommercePolicy(payload.raw ?? payload.parsed).policy;
}

export function useCommercePolicy(): CommercePolicy {
  const { data } = useQuery({
    queryKey: COMMERCE_POLICY_QUERY_KEY,
    queryFn: fetchCommercePolicy,
    // Long enough that navigation does not re-request it, short enough that an
    // admin's change is picked up within a session without a restart.
    staleTime: 5 * 60 * 1000,
  });

  return data ?? COMMERCE_POLICY_DEFAULTS;
}
