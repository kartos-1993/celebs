import type { PreviewFilters, ProductListItem, ProductSortKey, StockState } from '../types';

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

export function getCategoryName(product: ProductListItem): string {
  const category = product.category;
  if (typeof category === 'string') return category;
  return category?.name ?? 'Uncategorized';
}

export function getVendorDisplay(product: ProductListItem): string {
  return product.vendorName || 'Independent Seller';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '–';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getProductStock(product: ProductListItem): number {
  const skuStock = Array.isArray(product.skus)
    ? product.skus.reduce((sum, sku) => sum + (Number(sku?.stock) || 0), 0)
    : 0;
  const variantStock = Array.isArray(product.colorVariants)
    ? product.colorVariants.reduce(
        (sum, variant) =>
          sum +
          (Array.isArray(variant?.stocks)
            ? variant.stocks.reduce((inner, s) => inner + (Number(s?.quantity) || 0), 0)
            : 0),
        0,
      )
    : 0;
  return skuStock + variantStock;
}

export function getStockState(total: number): StockState {
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
  products: ProductListItem[],
  filters: PreviewFilters,
): ProductListItem[] {
  return products.filter((product) => {
    if (filters.vendor !== 'all' && getVendorDisplay(product) !== filters.vendor) return false;
    if (filters.category !== 'all' && getCategoryName(product) !== filters.category) return false;
    if (filters.stock !== 'all' && getStockState(getProductStock(product)) !== filters.stock) {
      return false;
    }
    return true;
  });
}

export function uniqueVendors(products: ProductListItem[]): string[] {
  return Array.from(new Set(products.map(getVendorDisplay))).sort();
}

export function uniqueCategories(products: ProductListItem[]): string[] {
  return Array.from(new Set(products.map(getCategoryName))).sort();
}

export function sumPrices(products: ProductListItem[]): number {
  return products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
}

export function avgStock(products: ProductListItem[]): number {
  if (products.length === 0) return 0;
  const total = products.reduce((sum, p) => sum + getProductStock(p), 0);
  return Math.round((total / products.length) * 10) / 10;
}
