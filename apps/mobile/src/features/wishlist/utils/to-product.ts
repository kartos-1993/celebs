import { validDiscount } from '@celebs/shared-utils';

import type { WishlistEntryView } from '../types';

import type { Product } from '@/features/products/hooks/use-products';

/**
 * Projects a wishlist row onto a Product card. Only real, hydrated values are
 * carried over: no invented "Product" name, no fabricated 0 price, no hardcoded
 * publication status, and the discount goes through the shared choke point.
 */
export function toProduct(entry: WishlistEntryView): Product {
  const p = entry.product;
  const price = Number(p.price);
  const listPrice = Number.isFinite(price) ? price : 0;
  const deal = validDiscount(listPrice, p.discountedPrice);

  return {
    id: p.id,
    name: p.name,
    ...(p.brand ? { brand: p.brand } : {}),
    price: listPrice,
    ...(deal !== undefined ? { discountedPrice: deal } : {}),
    mainImages: Array.isArray(p.mainImages) ? p.mainImages : [],
  };
}
