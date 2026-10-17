import { validDiscount } from '@celebs/shared-utils';

import type { WishlistEntryView } from '../types';

import type { Product } from '@/features/products/hooks/use-products';
import { firstRenderableImage } from '@/utils/image';

/**
 * Projects a wishlist row onto a Product card. Only real, hydrated values are
 * carried over: no invented "Product" name, no fabricated 0 price, no hardcoded
 * publication status, and the discount goes through the shared choke point.
 *
 * The row is the one payload that still arrives with the raw `mainImages`
 * gallery, so it is folded down to the single derived `cover` the grid card
 * reads — the card never learns which payload it came from.
 */
export function toProduct(entry: WishlistEntryView): Product {
  const p = entry.product;
  const price = Number(p.price);
  const listPrice = Number.isFinite(price) ? price : 0;
  const deal = validDiscount(listPrice, p.discountedPrice);
  const cover = p.cover?.trim() || firstRenderableImage(p.mainImages);

  return {
    id: p.id,
    name: p.name,
    ...(p.brand ? { brand: p.brand } : {}),
    price: listPrice,
    ...(deal !== undefined ? { discountedPrice: deal } : {}),
    ...(cover ? { cover } : {}),
  };
}
