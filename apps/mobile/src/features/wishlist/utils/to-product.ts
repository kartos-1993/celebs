import type { WishlistEntryView } from '../types';

import type { Product } from '@/features/products/hooks/use-products';

export function toProduct(entry: WishlistEntryView): Product {
  const p = entry?.product;
  const rawPrice = Number(p?.price ?? 0);
  const rawDiscount =
    p?.discountedPrice != null && !isNaN(Number(p.discountedPrice))
      ? Number(p.discountedPrice)
      : undefined;

  return {
    id: p?.id || entry?.productId || '',
    name: p?.name || 'Product',
    ...(p?.brand ? { brand: p.brand } : {}),
    price: isNaN(rawPrice) ? 0 : rawPrice,
    ...(rawDiscount !== undefined ? { discountedPrice: rawDiscount } : {}),
    mainImages: Array.isArray(p?.mainImages) ? p.mainImages : [],
    status: 'published',
  };
}
