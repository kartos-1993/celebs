import { useQuery } from '@tanstack/react-query';

import { getProductById, PRODUCT_QUERY_KEYS } from '@/features/products/api';
import type { Product } from '@/features/products/types';

const PRODUCT_STALE_TIME_MS = 1000 * 60 * 5;

/**
 * The current product behind a cart line, used to resolve the row's thumbnail
 * at render time.
 *
 * The cart endpoint now denormalises the canonical `cover` onto every line, so
 * the colourless case (and the optimistic row, which has no cover yet) can be
 * painted from the line alone. It does NOT send `colorVariants`, and the live
 * resolution contract in `resolveCartLineImage` asks for the LINE'S OWN colour
 * variant photo whenever the line has a colour — so this hook is not
 * removable, only cheaper: reading through the shared
 * `PRODUCT_QUERY_KEYS.detail` entry means the cart reuses — and refetches with
 * — the exact same cache the grid and the PDP already populate, so opening a
 * cart right after browsing costs no extra request and a gallery swap shows up
 * without a cart refetch.
 */
export function useCartLineProduct(productId: string) {
  return useQuery<Product>({
    queryKey: PRODUCT_QUERY_KEYS.detail(productId),
    queryFn: () => getProductById(productId),
    enabled: Boolean(productId),
    staleTime: PRODUCT_STALE_TIME_MS,
  });
}
