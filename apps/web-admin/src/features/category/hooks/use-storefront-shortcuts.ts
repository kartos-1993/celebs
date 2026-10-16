import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  CATEGORY_QUERY_KEYS,
  createStorefrontShortcut,
  deleteStorefrontShortcut,
  getStorefrontShortcutsForCategory,
  updateStorefrontShortcut,
} from '../api';
import { StorefrontShortcut } from '../types';

export function useStorefrontShortcuts(categoryId?: string) {
  const queryClient = useQueryClient();

  const queryKey = categoryId
    ? CATEGORY_QUERY_KEYS.storefrontShortcuts(categoryId)
    : [...CATEGORY_QUERY_KEYS.all, 'storefront-shortcuts'];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!categoryId) return [];
      const res = await getStorefrontShortcutsForCategory(categoryId);
      return res.data || [];
    },
    enabled: !!categoryId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<StorefrontShortcut>) => {
      if (payload.id) {
        const res = await updateStorefrontShortcut(payload.id, payload);
        return res.data;
      } else {
        const res = await createStorefrontShortcut(payload);
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
      const res = await deleteStorefrontShortcut(id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.tree() });
    },
  });

  return {
    shortcuts: data || [],
    isLoading,
    isError,
    error,
    refetch,
    saveShortcut: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteShortcut: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
