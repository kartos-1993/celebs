import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CATEGORY_QUERY_KEYS,
  createQuickFilter,
  deleteQuickFilter,
  getQuickFiltersForCategory,
  updateQuickFilter,
} from '../api';
import { QuickFilter } from '../types';

export function useQuickFilters(categoryId?: string) {
  const queryClient = useQueryClient();

  const queryKey = categoryId
    ? CATEGORY_QUERY_KEYS.quickFilters(categoryId)
    : [...CATEGORY_QUERY_KEYS.all, 'quick-filters'];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!categoryId) return [];
      const res = await getQuickFiltersForCategory(categoryId);
      return res.data || [];
    },
    enabled: !!categoryId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<QuickFilter>) => {
      if (payload.id) {
        const res = await updateQuickFilter(payload.id, payload);
        return res.data;
      } else {
        const res = await createQuickFilter(payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.tree() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteQuickFilter(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.tree() });
    },
  });

  return {
    quickFilters: data || [],
    isLoading,
    isError,
    error,
    refetch,
    saveQuickFilter: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteQuickFilter: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
