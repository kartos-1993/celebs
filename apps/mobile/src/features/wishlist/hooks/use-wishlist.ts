import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addToWishlist, getWishlist, removeFromWishlist, WISHLIST_QUERY_KEYS } from '../api';
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

/**
 * What the caller can supply for the optimistic row. Passing the real product
 * snapshot is what keeps the card from flashing blank (name "" / price 0)
 * between the tap and the server echo; without it the cache is left untouched.
 */
export interface WishlistAddSnapshot {
  name?: string;
  slug?: string;
  brand?: string | null;
  price?: number;
  discountedPrice?: number | null;
  /** The derived primary photo — the only image field a storefront product has. */
  cover?: string;
}

export type WishlistAddInput = string | { productId: string; product?: WishlistAddSnapshot };

const OPTIMISTIC_ID_PREFIX = 'optimistic-';

function toProductId(input: WishlistAddInput): string {
  return typeof input === 'string' ? input : input.productId;
}

function toSnapshot(input: WishlistAddInput): WishlistAddSnapshot | undefined {
  return typeof input === 'string' ? undefined : input.product;
}

/** Optimistic add/remove against /wishlist with rollback context */
export function useWishlistActions() {
  const queryClient = useQueryClient();

  const applyOptimisticAdd = useCallback(
    (productId: string, snapshot: WishlistAddSnapshot | undefined) => {
      // No snapshot means nothing honest to render — inserting a blank card
      // would flash a nameless 0-price tile, so the cache stays as-is until the
      // server answers.
      if (!snapshot) return;
      const cover = snapshot.cover?.trim();
      queryClient.setQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEYS.all, (previous) => {
        const current = previous ?? [];
        if (current.some((entry) => entry.productId === productId)) return current;
        return [
          {
            id: `${OPTIMISTIC_ID_PREFIX}${productId}`,
            productId,
            addedAt: new Date().toISOString(),
            product: {
              id: productId,
              name: snapshot.name ?? '',
              ...(snapshot.brand ? { brand: snapshot.brand } : {}),
              slug: snapshot.slug ?? '',
              price: Number.isFinite(Number(snapshot.price)) ? Number(snapshot.price) : 0,
              ...(snapshot.discountedPrice != null
                ? { discountedPrice: Number(snapshot.discountedPrice) }
                : {}),
              // The optimistic row carries the single `cover` the caller had;
              // the server echo replaces it with the real gallery + cover.
              ...(cover ? { cover } : {}),
            },
          },
          ...current,
        ];
      });
    },
    [queryClient],
  );

  const applyOptimisticRemove = useCallback(
    (productId: string) => {
      queryClient.setQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEYS.all, (previous) =>
        (previous ?? []).filter((entry) => entry.productId !== productId),
      );
    },
    [queryClient],
  );

  const snapshotPrevious = useCallback(
    () => queryClient.getQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEYS.all),
    [queryClient],
  );

  const addMutation = useMutation({
    mutationFn: (input: WishlistAddInput) => addToWishlist(toProductId(input)),
    onMutate: async (input: WishlistAddInput) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
      const previousWishlist = snapshotPrevious();
      applyOptimisticAdd(toProductId(input), toSnapshot(input));
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
    onError: (_err, _input, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData<WishlistEntryView[]>(
          WISHLIST_QUERY_KEYS.all,
          context.previousWishlist,
        );
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onMutate: async (productId: string) => {
      await queryClient.cancelQueries({ queryKey: WISHLIST_QUERY_KEYS.all });
      const previousWishlist = snapshotPrevious();
      applyOptimisticRemove(productId);
      return { previousWishlist };
    },
    onSuccess: (_data, productId) => {
      applyOptimisticRemove(productId);
    },
    onError: (_err, _productId, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData<WishlistEntryView[]>(
          WISHLIST_QUERY_KEYS.all,
          context.previousWishlist,
        );
      }
    },
  });

  return { addToWishlist: addMutation, removeFromWishlist: removeMutation };
}
