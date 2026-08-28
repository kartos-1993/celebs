import type { WishlistApiResponse, WishlistEntryView } from './types';

import { apiClient } from '@/api/client';

export const WISHLIST_QUERY_KEYS = {
  all: ['wishlist'] as const,
};

export async function getWishlist(): Promise<WishlistEntryView[]> {
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
}

export async function addToWishlistApi(productId: string): Promise<void> {
  await apiClient.post('/wishlist', { productId });
}

export async function removeFromWishlistApi(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`);
}
