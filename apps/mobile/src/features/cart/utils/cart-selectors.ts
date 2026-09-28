import type { CartItemHydrated } from '@celebs/shared-types';
import { validDiscount } from '@celebs/shared-utils';

/** WONTFIX: single free-shipping threshold value (owner: product) — the cart has always used 999 and checkout 3000. Both numbers now live in this one module so a decision only has to be made here, but neither value was changed. */
export const FREE_SHIPPING_THRESHOLD = 999;

/** WONTFIX: single free-shipping threshold value (owner: product) — checkout's historical 3000, kept verbatim. Unify with FREE_SHIPPING_THRESHOLD above. */
export const CHECKOUT_FREE_SHIPPING_THRESHOLD = 3000;

/**
 * Unit price via the shared discount choke point: an above-list, zero, NaN or
 * absent discountedPrice can never inflate a cart total.
 */
export const getUnitPrice = (item: CartItemHydrated): number =>
  validDiscount(item.price, item.discountedPrice) ?? item.price;

export const getDiscountPercent = (item: CartItemHydrated): number => {
  const deal = validDiscount(item.price, item.discountedPrice);
  if (deal === undefined || item.price <= 0) return 0;
  return Math.round(((item.price - deal) / item.price) * 100);
};

export const formatPrice = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface CartItemGroup {
  brand: string;
  items: CartItemHydrated[];
}

export const groupItemsByBrand = (items: CartItemHydrated[]): CartItemGroup[] => {
  const byBrand = new Map<string, CartItemHydrated[]>();
  for (const item of items) {
    const brand = item.productBrand?.trim() || 'Other';
    const existing = byBrand.get(brand);
    if (existing) {
      existing.push(item);
    } else {
      byBrand.set(brand, [item]);
    }
  }
  return Array.from(byBrand.entries()).map(([brand, groupItems]) => ({ brand, items: groupItems }));
};

export interface CartTotals {
  count: number;
  total: number;
  originalTotal: number;
  savings: number;
  savingsPercent: number;
}

export const computeTotals = (items: CartItemHydrated[]): CartTotals => {
  let count = 0;
  let total = 0;
  let originalTotal = 0;
  for (const item of items) {
    count += item.quantity;
    total += getUnitPrice(item) * item.quantity;
    originalTotal += item.price * item.quantity;
  }
  const savings = Math.max(0, originalTotal - total);
  const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;
  return { count, total, originalTotal, savings, savingsPercent };
};

/**
 * The slice of a product a cart line needs in order to show a picture. Kept
 * structural (not `Product`) so the resolver stays a pure function of
 * (line, product) and unit-testable without a component tree.
 */
export interface CartLineImageSource {
  /** Derived single image the API sends to storefront clients. */
  cover?: string | null;
  colorVariants?: { name?: string; images?: string[] | null }[] | null;
}

const firstUsable = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

/**
 * The display image for a cart row, derived LIVE from the product rather than
 * read off the line.
 *
 * `CartItemHydrated.image` is a frozen denormalised snapshot: it is `''` on the
 * optimistic "adding…" row (nothing has been echoed back yet) and stale on any
 * row hydrated before the seller swapped the gallery. A cart row must still
 * show a picture in both cases, so the picture is resolved here — the line's
 * own colour variant photo when it has a colour, the product cover otherwise.
 *
 * Returns the RAW stored source (not a URL) so the caller feeds it to the one
 * canonical resolver, and `undefined` — never `''` — when the product carries
 * no picture at all, so the card can render a neutral tile instead of a broken
 * `<Image source={{ uri: '' }} />`.
 */
export function resolveCartLineImage(
  item: Pick<CartItemHydrated, 'colorVariantName'>,
  product: CartLineImageSource | null | undefined,
): string | undefined {
  const wantedColor = firstUsable(item?.colorVariantName)?.toLowerCase();

  if (wantedColor && Array.isArray(product?.colorVariants)) {
    const match = product.colorVariants.find(
      (variant) => firstUsable(variant?.name)?.toLowerCase() === wantedColor,
    );
    const variantImage = firstUsable(match?.images?.[0]);
    if (variantImage) return variantImage;
  }

  return firstUsable(product?.cover);
}
