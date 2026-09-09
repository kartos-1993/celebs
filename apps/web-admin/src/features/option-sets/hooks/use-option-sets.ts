import { useQuery } from '@tanstack/react-query';

import { fetchOptionSetById, fetchOptionSets } from '../api';
import type { OptionSet } from '../types';

export const OPTION_SET_QUERY_KEYS = {
  all: ['option-sets'] as const,
  lists: () => [...OPTION_SET_QUERY_KEYS.all, 'list'] as const,
  list: () => [...OPTION_SET_QUERY_KEYS.lists()] as const,
  details: () => [...OPTION_SET_QUERY_KEYS.all, 'detail'] as const,
  detail: (id?: string) => [...OPTION_SET_QUERY_KEYS.details(), id] as const,
  values: (id?: string) => [...OPTION_SET_QUERY_KEYS.all, 'values', id] as const,
};

export function useOptionSets(enabled = true) {
  return useQuery<OptionSet[]>({
    queryKey: OPTION_SET_QUERY_KEYS.list(),
    queryFn: fetchOptionSets,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOptionSetDetail(id?: string, enabled = true) {
  return useQuery<OptionSet>({
    queryKey: OPTION_SET_QUERY_KEYS.detail(id),
    queryFn: () => (id ? fetchOptionSetById(id) : Promise.reject(new Error('No ID provided'))),
    enabled: Boolean(enabled && id),
    staleTime: 5 * 60 * 1000,
  });
}
