import type { IApiResponse } from '@celebs/shared-types';

import type { WishlistEntryView } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const WISHLIST_QUERY_KEYS = {
  all: ['wishlist'] as const,
  lists: () => [...WISHLIST_QUERY_KEYS.all, 'list'] as const,
  details: () => [...WISHLIST_QUERY_KEYS.all, 'detail'] as const,
};

function mapWishlistEntry(entry: {
  id: string;
  productId: string;
  addedAt: string;
  product?: {
    id?: string;
    name?: string;
    brand?: string | null;
    slug?: string;
    price?: number;
    discountedPrice?: number | null;
    mainImages?: string[];
  };
}): WishlistEntryView {
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

export async function getWishlist(): Promise<WishlistEntryView[]> {
  const data = await handleApiResponse(
    apiClient.get<IApiResponse<WishlistEntryView[]>>('/wishlist'),
  );
  const entries = Array.isArray(data) ? data : [];
  return entries.filter((entry) => Boolean(entry && entry.productId)).map(mapWishlistEntry);
}

export async function addToWishlist(productId: string): Promise<WishlistEntryView | null> {
  const entry = await handleApiResponse(
    apiClient.post<IApiResponse<WishlistEntryView>>('/wishlist', { productId }),
  );
  if (!entry) return null;
  return mapWishlistEntry(entry);
}

export async function removeFromWishlist(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`);
}

export const addToWishlistApi = addToWishlist;
export const removeFromWishlistApi = removeFromWishlist;
