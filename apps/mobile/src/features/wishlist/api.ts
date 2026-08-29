import type { WishlistApiResponse, WishlistEntryView } from './types';

import { apiClient } from '@/api/client';

export const WISHLIST_QUERY_KEYS = {
  all: ['wishlist'] as const,
  lists: () => [...WISHLIST_QUERY_KEYS.all, 'list'] as const,
  details: () => [...WISHLIST_QUERY_KEYS.all, 'detail'] as const,
};

export async function getWishlist(): Promise<WishlistEntryView[]> {
  const response = await apiClient.get<WishlistApiResponse>('/wishlist');
  const entries = Array.isArray(response.data?.data) ? response.data.data : [];
  return entries
    .filter((entry) => Boolean(entry && entry.productId))
    .map((entry) => ({
      id: entry.id,
      productId: entry.productId,
      addedAt: entry.addedAt,
      product: {
        id: entry.product?.id || entry.productId,
        name: entry.product?.name || 'Product',
        ...(entry.product?.brand ? { brand: entry.product.brand } : {}),
        slug: entry.product?.slug || '',
        price: Number(entry.product?.price ?? 0),
        ...(entry.product?.discountedPrice
          ? { discountedPrice: Number(entry.product.discountedPrice) }
          : {}),
        mainImages: Array.isArray(entry.product?.mainImages) ? entry.product.mainImages : [],
      },
    }));
}

export async function addToWishlist(productId: string): Promise<WishlistEntryView | null> {
  const response = await apiClient.post<{
    success: boolean;
    data?: {
      id: string;
      productId: string;
      addedAt: string;
      product?: {
        id?: string;
        name?: string;
        brand?: string | null;
        slug?: string;
        price?: number;
        discountedPrice?: number;
        mainImages?: string[];
      };
    };
  }>('/wishlist', { productId });

  const entry = response.data?.data;
  if (!entry) return null;

  return {
    id: entry.id,
    productId: entry.productId,
    addedAt: entry.addedAt,
    product: {
      id: entry.product?.id || entry.productId,
      name: entry.product?.name || 'Product',
      ...(entry.product?.brand ? { brand: entry.product.brand } : {}),
      slug: entry.product?.slug || '',
      price: Number(entry.product?.price ?? 0),
      ...(entry.product?.discountedPrice
        ? { discountedPrice: Number(entry.product.discountedPrice) }
        : {}),
      mainImages: Array.isArray(entry.product?.mainImages) ? entry.product.mainImages : [],
    },
  };
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`);
}

export const addToWishlistApi = addToWishlist;
export const removeFromWishlistApi = removeFromWishlist;
