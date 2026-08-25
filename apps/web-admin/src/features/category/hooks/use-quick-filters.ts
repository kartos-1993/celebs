import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createQuickFilter,
  deleteQuickFilter,
  getQuickFiltersForCategory,
  updateQuickFilter,
} from '../api';
import { QuickFilter } from '../types';

export function useQuickFilters(categoryId?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['quick-filters', categoryId],
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
      queryClient.invalidateQueries({ queryKey: ['quick-filters', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteQuickFilter(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-filters', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['category-tree'] });
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
