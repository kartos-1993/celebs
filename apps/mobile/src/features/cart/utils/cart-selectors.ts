import type { CartItemHydrated } from '@celebs/shared-types';
import { formatMoneyAmount, validDiscount } from '@celebs/shared-utils';

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

/**
 * Shared with web-admin so the two apps cannot render the same figure
 * differently. Works on the characters rather than calling toLocaleString's
 * fractional rounding, which is wrong at the edges.
 */
export const formatPrice = (value: number): string => formatMoneyAmount(value);

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

/**
 * Converts a rupee amount to whole paisa.
 *
 * Math.round rather than a truncation, because a 2-decimal price multiplied by
 * 100 lands very slightly off an integer (0.07 * 100 is 7.000000000000001) and
 * truncating that would drop a paisa off a price the shopper is shown.
 */
const toPaisa = (value: number): number => Math.round(value * 100);

export const computeTotals = (items: CartItemHydrated[]): CartTotals => {
  // Summed in whole paisa, then converted once.
  //
  // The shopper reads this figure off the cart and then reads a different figure
  // off checkout, which the server computes in Decimal. Adding rupee floats here
  // makes the two disagree by a paisa often enough to look like a bug, and it
  // undermines the price the shopper is being shown.
  let count = 0;
  let totalPaisa = 0;
  let originalPaisa = 0;

  for (const item of items) {
    count += item.quantity;
    totalPaisa += toPaisa(getUnitPrice(item)) * item.quantity;
    originalPaisa += toPaisa(item.price) * item.quantity;
  }

  const savingsPaisa = Math.max(0, originalPaisa - totalPaisa);
  const originalTotal = originalPaisa / 100;

  return {
    count,
    total: totalPaisa / 100,
    originalTotal,
    savings: savingsPaisa / 100,
    savingsPercent: originalPaisa > 0 ? Math.round((savingsPaisa / originalPaisa) * 100) : 0,
  };
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
