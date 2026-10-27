import { useQuery } from '@tanstack/react-query';

import { COMMERCE_POLICY_DEFAULTS, type CommercePolicy } from '@celebs/shared-types';

import { CHECKOUT_QUERY_KEYS, fetchCommercePolicy } from '../api';

/**
 * The commerce policy — COD ceiling, delivery fee, free-delivery threshold — as
 * the server currently has it.
 *
 * Read from the public settings endpoint via the centralized API client layer.
 * The shipped defaults stand in until the request resolves, and stay in place if
 * it fails, so a settings outage degrades to predictable behavior rather than a
 * blank total.
 */
export function useCommercePolicy(): CommercePolicy {
  const { data } = useQuery({
    queryKey: CHECKOUT_QUERY_KEYS.commercePolicy(),
    queryFn: fetchCommercePolicy,
    // Long enough that navigation does not re-request it, short enough that an
    // admin's change is picked up within a session without a restart.
    staleTime: 5 * 60 * 1000,
  });

  return data ?? COMMERCE_POLICY_DEFAULTS;
}
