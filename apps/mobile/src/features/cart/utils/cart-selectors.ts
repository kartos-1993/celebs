import { CartItemHydrated } from '@celebs/shared-types';

export const FREE_SHIPPING_THRESHOLD = 999;

export const getUnitPrice = (item: CartItemHydrated): number => item.discountedPrice ?? item.price;

export const getDiscountPercent = (item: CartItemHydrated): number => {
  if (!item.discountedPrice || item.price <= 0 || item.discountedPrice >= item.price) return 0;
  return Math.round(((item.price - item.discountedPrice) / item.price) * 100);
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
