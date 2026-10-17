import type { IApiResponse } from '@celebs/shared-types';

import type { WishlistEntryView } from './types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';
import { firstRenderableImage } from '@/utils/image';

export const WISHLIST_QUERY_KEYS = {
  all: ['wishlist'] as const,
  lists: () => [...WISHLIST_QUERY_KEYS.all, 'list'] as const,
  details: () => [...WISHLIST_QUERY_KEYS.all, 'detail'] as const,
};

interface WishlistProductPayload {
  id?: string;
  name?: string;
  brand?: string | null;
  slug?: string;
  price?: number | null;
  discountedPrice?: number | null;
  mainImages?: string[];
  cover?: string;
}

interface WishlistEntryPayload {
  id?: string;
  productId?: string | null;
  addedAt?: string;
  product?: WishlistProductPayload;
}

function finiteOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Wishlist rows are the one payload that still arrives with the raw
 * `mainImages` gallery instead of a derived `cover`, so the gallery is kept
 * AND folded into a `cover` here. Every downstream surface then reads the
 * single primary field and never has to branch on which payload it got.
 */
function mapWishlistEntry(entry: WishlistEntryPayload): WishlistEntryView | null {
  const product = entry?.product;
  if (!entry?.id || !entry.productId || !product?.id) return null;

  const gallery = Array.isArray(product.mainImages) ? product.mainImages : [];
  const cover = firstRenderableImage(gallery) ?? (product.cover?.trim() || undefined);

  return {
    id: entry.id,
    productId: entry.productId,
    addedAt: entry.addedAt ?? '',
    product: {
      id: product.id,
      name: product.name ?? '',
      ...(product.brand ? { brand: product.brand } : {}),
      slug: product.slug ?? '',
      price: finiteOrZero(product.price),
      ...(product.discountedPrice != null
        ? { discountedPrice: finiteOrZero(product.discountedPrice) }
        : {}),
      mainImages: gallery,
      ...(cover ? { cover } : {}),
    },
  };
}

export async function getWishlist(): Promise<WishlistEntryView[]> {
  const data = await handleApiResponse(apiClient.get<IApiResponse<unknown>>('/wishlist'));
  // handleApiResponse already validated the envelope; a non-array payload is a
  // broken endpoint contract, not an empty wishlist (mobile AGENTS.md §5/§7).
  if (!Array.isArray(data)) {
    throw new Error(
      'Malformed /wishlist payload: expected an array of wishlist entries. Fix the backend controller.',
    );
  }
  return (data as WishlistEntryPayload[])
    .map(mapWishlistEntry)
    .filter((entry): entry is WishlistEntryView => entry !== null);
}

export async function addToWishlist(productId: string): Promise<WishlistEntryView | null> {
  const entry = await handleApiResponse(
    apiClient.post<IApiResponse<WishlistEntryPayload>>('/wishlist', { productId }),
  );
  if (!entry) return null;
  return mapWishlistEntry(entry);
}

export async function removeFromWishlist(productId: string): Promise<void> {
  // Routed through the shared handler so a 2xx `success: false` envelope throws
  // instead of silently resolving and leaving the row on screen.
  await handleApiResponse(apiClient.delete<IApiResponse<null>>(`/wishlist/${productId}`));
}

export const addToWishlistApi = addToWishlist;
export const removeFromWishlistApi = removeFromWishlist;
