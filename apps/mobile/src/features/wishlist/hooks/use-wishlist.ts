import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
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

  const addMutation = useMutation({
    mutationFn: (productId: string) => addToWishlist(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
      const previousWishlist = queryClient.getQueryData<WishlistEntryView[]>(
        WISHLIST_QUERY_KEYS.all,
      );
      applyOptimistic(productId, true);
      return { previousWishlist };
    },
    onSuccess: (savedEntry) => {
      if (savedEntry) {
        queryClient.setQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEYS.all, (previous) => {
          const current = previous ?? [];
          const exists = current.some((item) => item.productId === savedEntry.productId);
          if (exists) {
            return current.map((item) =>
              item.productId === savedEntry.productId ? savedEntry : item,
            );
          }
          return [savedEntry, ...current];
        });
      }
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEYS.all, context.previousWishlist);
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
      const previousWishlist = queryClient.getQueryData<WishlistEntryView[]>(
        WISHLIST_QUERY_KEYS.all,
      );
      applyOptimistic(productId, false);
      return { previousWishlist };
    },
    onSuccess: (_data, productId) => {
      queryClient.setQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEYS.all, (previous) =>
        (previous ?? []).filter((entry) => entry.productId !== productId),
      );
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(WISHLIST_QUERY_KEYS.all, context.previousWishlist);
      }
    },
  });

  return { addToWishlist: addMutation, removeFromWishlist: removeMutation };
}
