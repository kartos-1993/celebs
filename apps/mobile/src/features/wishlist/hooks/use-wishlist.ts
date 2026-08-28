import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addToWishlistApi,
  getWishlist,
  removeFromWishlistApi,
  WISHLIST_QUERY_KEYS,
} from '../api';
import type { WishlistEntryView } from '../types';

import { useAuth } from '@/features/auth/context/auth-context';

export { WISHLIST_QUERY_KEYS } from '../api';
export const WISHLIST_QUERY_KEY = WISHLIST_QUERY_KEYS.all;
export type { WishlistEntryView, WishlistProductView } from '../types';

/** Signed-in user's wishlist (products hydrated by the API) */
export function useWishlist(enabled: boolean = true) {
  const { isLoggedIn, isLoading } = useAuth();
  const shouldEnable = Boolean(enabled && isLoggedIn && !isLoading);

  const query = useQuery({
    queryKey: WISHLIST_QUERY_KEYS.all,
    enabled: shouldEnable,
    staleTime: 1000 * 30,
    queryFn: getWishlist,
  });

  const entries = useMemo(() => query.data ?? [], [query.data]);
  const wishlistedIds = useMemo(() => new Set(entries.map((e) => e.productId)), [entries]);

  return {
    entries,
    wishlistedIds,
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.error?.message ?? null,
    refresh: query.refetch,
  };
}

/**
 * Membership check backed by the shared ['wishlist'] cache
 */
export function useWishlistStatus() {
  const { isLoggedIn, isLoading } = useAuth();
  const { wishlistedIds } = useWishlist(isLoggedIn && !isLoading);

  const isWishlisted = useCallback(
    (productId: string) => isLoggedIn && !isLoading && wishlistedIds.has(productId),
    [isLoggedIn, isLoading, wishlistedIds],
  );

  return { isWishlisted };
}

/** Optimistic add/remove against /wishlist with rollback context */
export function useWishlistActions() {
  const queryClient = useQueryClient();

  const applyOptimistic = useCallback(
    (productId: string, adding: boolean) => {
      queryClient.setQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEYS.all, (previous) => {
        const current = previous ?? [];
        if (adding) {
          if (current.some((entry) => entry.productId === productId)) return current;
          return [
            {
              id: `optimistic-${productId}`,
              productId,
              addedAt: new Date().toISOString(),
              product: {
                id: productId,
                name: '',
                slug: '',
                price: 0,
                mainImages: [],
              },
            },
            ...current,
          ];
        }
        return current.filter((entry) => entry.productId !== productId);
      });
    },
    [queryClient],
  );

  const addToWishlist = useMutation({
    mutationFn: (productId: string) => addToWishlistApi(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
      const previousWishlist = queryClient.getQueryData<WishlistEntryView[]>(
        WISHLIST_QUERY_KEYS.all,
      );
      applyOptimistic(productId, true);
      return { previousWishlist };
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEYS.all, context.previousWishlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
    },
  });

  const removeFromWishlist = useMutation({
    mutationFn: (productId: string) => removeFromWishlistApi(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
      const previousWishlist = queryClient.getQueryData<WishlistEntryView[]>(
        WISHLIST_QUERY_KEYS.all,
      );
      applyOptimistic(productId, false);
      return { previousWishlist };
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEYS.all, context.previousWishlist);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
    },
  });

  return { addToWishlist, removeFromWishlist };
}
