import type { AdminProductListItem } from '@celebs/shared-types';

import type { PreviewFilters, ProductSortKey, StockState } from '../types';

export function sortKeyToParams(sortKey: ProductSortKey): {
  sortBy: 'createdAt' | 'price' | 'name';
  sortOrder: 'asc' | 'desc';
} {
  switch (sortKey) {
    case 'price-asc':
      return { sortBy: 'price', sortOrder: 'asc' };
    case 'price-desc':
      return { sortBy: 'price', sortOrder: 'desc' };
    case 'name-asc':
      return { sortBy: 'name', sortOrder: 'asc' };
    case 'newest':
    default:
      return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
}

export function getCategoryName(product: AdminProductListItem): string {
  return product.category?.name ?? 'Uncategorized';
}

export function getCategoryImage(product: AdminProductListItem): string | undefined {
  return product.category?.imageUrl;
}

/** Declared cover first, placeholder fallback. */
export function getProductCover(product: AdminProductListItem): string {
  return product.cover || '/placeholder.svg';
}

export function getVendorDisplay(product: { vendorName?: string | null }): string {
  return product.vendorName || 'Independent Seller';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Total sellable units, or `null` when the server sent none.
 *
 * The bare `stockTotal` this replaced evaluated as `undefined` downstream:
 * `getStockState(undefined)` made `undefined <= 0` false and classified a
 * product with no stock as "in stock", and `avgStock` summed `NaN`. Missing is
 * now carried as missing instead of as a zero the seller never set.
 */
export function getProductStock(product: AdminProductListItem): number | null {
  const raw = product.stockTotal;
  if (raw === null || raw === undefined) return null;
  const total = Number(raw);
  return Number.isFinite(total) ? total : null;
}

export function getStockState(total: number | null): StockState {
  if (total === null) return 'out';
  if (total <= 0) return 'out';
  if (total < 10) return 'low';
  return 'in';
}

export function formatShortDate(value: unknown): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Preview-only client filtering on the current page. Server pagination is
 * unchanged, so these filters do not reach across pages yet — the backend
 * needs vendorId/category/stock params for that (see productFilterSchema).
 */
export function applyPreviewFilters(
  products: AdminProductListItem[],
  filters: PreviewFilters,
): AdminProductListItem[] {
  return products.filter((product) => {
    if (filters.vendor !== 'all' && getVendorDisplay(product) !== filters.vendor) return false;
    if (filters.category !== 'all' && getCategoryName(product) !== filters.category) return false;
    if (filters.stock !== 'all' && getStockState(getProductStock(product)) !== filters.stock) {
      return false;
    }
    return true;
  });
}

export function uniqueVendors(products: AdminProductListItem[]): string[] {
  return Array.from(new Set(products.map(getVendorDisplay))).sort();
}

export function uniqueCategories(products: AdminProductListItem[]): string[] {
  return Array.from(new Set(products.map(getCategoryName))).sort();
}

export function sumPrices(products: AdminProductListItem[]): number {
  return products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
}

/**
 * Listed price, or `null` when the product has none. `Number(null ?? 0)`
 * rendered a product with no price as "Rs. 0" — a real price the seller never
 * set. The empty state is a dash, matching `formatShortDate`.
 */
export function getProductPrice(product: AdminProductListItem): number | null {
  if (product.price === null || product.price === undefined) return null;
  const price = Number(product.price);
  return Number.isFinite(price) ? price : null;
}

export function avgStock(products: AdminProductListItem[]): number | null {
  // Averaging over the products that actually reported a total: dividing by
  // `products.length` with a `null` in the sum produced `NaN`, and `NaN`
  // rendered as "NaN" in the summary tile.
  const totals = products.map(getProductStock).filter((total): total is number => total !== null);
  if (totals.length === 0) return null;
  const total = totals.reduce((sum, value) => sum + value, 0);
  return Math.round((total / totals.length) * 10) / 10;
}
