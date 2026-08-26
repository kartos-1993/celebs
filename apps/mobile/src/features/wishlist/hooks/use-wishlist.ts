import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/api/client';
import { useAuth } from '@/features/auth/context/auth-context';

export interface WishlistProductView {
  id: string;
  name: string;
  brand?: string;
  slug: string;
  price: number;
  discountedPrice?: number;
  mainImages: string[];
}

export interface WishlistEntryView {
  id: string;
  productId: string;
  addedAt: string;
  product: WishlistProductView;
}

export const WISHLIST_QUERY_KEY = ['wishlist'] as const;

interface WishlistApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    productId: string;
    addedAt: string;
    product: {
      id: string;
      name: string;
      brand?: string | null;
      slug: string;
      price: number;
      discountedPrice?: number | null;
      mainImages: string[];
    };
  }[];
}

/** Signed-in user's wishlist (products hydrated by the API) */
export function useWishlist(enabled: boolean) {
  const query = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    enabled,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<WishlistEntryView[]> => {
      const response = await apiClient.get<WishlistApiResponse>('/wishlist');
      const entries = Array.isArray(response.data?.data) ? response.data.data : [];
      return entries.map((entry) => ({
        id: entry.id,
        productId: entry.productId,
        addedAt: entry.addedAt,
        product: {
          id: entry.product.id,
          name: entry.product.name,
          ...(entry.product.brand ? { brand: entry.product.brand } : {}),
          slug: entry.product.slug,
          price: Number(entry.product.price ?? 0),
          ...(entry.product.discountedPrice
            ? { discountedPrice: Number(entry.product.discountedPrice) }
            : {}),
          mainImages: Array.isArray(entry.product.mainImages) ? entry.product.mainImages : [],
        },
      }));
    },
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
 * Membership check backed by the shared ['wishlist'] cache — usable anywhere
 * (PDP heart, grid-card hearts) without extra fetches once loaded.
 * Guests never hit the network: hearts render empty and tapping prompts login.
 * Waits for auth restore to finish to avoid SecureStore race after login.
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

/** Optimistic add/remove against /wishlist */
export function useWishlistActions() {
  const queryClient = useQueryClient();

  const applyOptimistic = useCallback(
    (productId: string, adding: boolean) => {
      queryClient.setQueryData<WishlistEntryView[]>(WISHLIST_QUERY_KEY, (previous) => {
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
    mutationFn: async (productId: string): Promise<void> => {
      await apiClient.post('/wishlist', { productId });
    },
    onMutate: async (productId: string) => {
      applyOptimistic(productId, true);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });

  const removeFromWishlist = useMutation({
    mutationFn: async (productId: string): Promise<void> => {
      await apiClient.delete(`/wishlist/${productId}`);
    },
    onMutate: async (productId: string) => {
      applyOptimistic(productId, false);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });

  return { addToWishlist, removeFromWishlist };
}
