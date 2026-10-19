import type { CartItemHydrated } from '@celebs/shared-types';
import {
  discountPercentFrom,
  formatMoneyAmount,
  moneyMax as moneyMaxExact,
  moneyMultiply as moneyMultiplyPrice,
  moneySubtract,
  moneySum,
  toPaisa,
  validDiscount,
} from '@celebs/shared-utils';

/**
 * The charged per-unit price, exactly as the server priced it: base price
 * (sale price only when it is a real discount) minus any applied per-unit
 * combo discount. The server's single line-price authority is what checkout
 * charges from, so the cart renders that figure rather than recomputing a
 * second opinion that can drift from the bill.
 */
export const getUnitPrice = (item: CartItemHydrated): number => item.unitPrice;

export const getDiscountPercent = (item: CartItemHydrated): number => {
  const deal = validDiscount(item.price, item.discountedPrice);
  if (deal === undefined) return 0;
  return discountPercentFrom(item.price, deal);
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

export const computeTotals = (items: CartItemHydrated[]): CartTotals => {
  // Summed through the shared exact-money helpers, so this total cannot drift from
  // the server's Decimal figure at checkout.
  let count = 0;
  for (const item of items) count += item.quantity;

  const originalTotal = moneySum(
    items.map((item) => moneyMultiplyPrice(item.price, item.quantity)),
  );
  const total = moneySum(
    items.map((item) => moneyMultiplyPrice(getUnitPrice(item), item.quantity)),
  );
  const savings = moneyMaxExact(0, moneySubtract(originalTotal, total));

  return {
    count,
    total,
    originalTotal,
    savings,
    savingsPercent:
      toPaisa(originalTotal) > 0
        ? Math.round((toPaisa(savings) / toPaisa(originalTotal)) * 100)
        : 0,
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
