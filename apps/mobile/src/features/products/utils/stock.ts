import type { Product, ProductColorVariant } from '../hooks/use-products';

export function isVariantOutOfStock(variant: ProductColorVariant | undefined): boolean {
  if (!variant) return false;
  // No stocks array => stock not tracked per-variant, treat as in-stock
  if (!Array.isArray(variant.stocks) || variant.stocks.length === 0) return false;
  return variant.stocks.every((s) => (s.quantity ?? 0) <= 0);
}

export function isProductFullyOutOfStock(product: Product | null | undefined): boolean {
  if (!product) return false;
  const variants = product.colorVariants;
  if (!Array.isArray(variants) || variants.length === 0) return false;
  // Product is fully OOS only if EVERY variant is OOS
  return variants.every(isVariantOutOfStock);
}

export function getStockQtyForVariantSize(
  variant: ProductColorVariant | undefined,
  sizeName: string,
): number | null {
  if (!variant || !Array.isArray(variant.stocks) || variant.stocks.length === 0) return null;
  const entry = variant.stocks.find((s) => s.size.toLowerCase() === sizeName.toLowerCase());
  return entry ? (entry.quantity ?? 0) : null;
}

export function isSizeOutOfStockForVariant(
  variant: ProductColorVariant | undefined,
  sizeName: string,
): boolean {
  const qty = getStockQtyForVariantSize(variant, sizeName);
  return qty !== null && qty <= 0;
}

export function isSelectedCombinationOutOfStock(
  product: Product | null | undefined,
  selectedColorIndex: number,
  selectedSize: string,
): boolean {
  if (!product) return false;
  const variant = product.colorVariants?.[selectedColorIndex];
  if (!variant) return false;
  if (!selectedSize) {
    // No size picked yet: consider OOS only if the whole variant is OOS
    return isVariantOutOfStock(variant);
  }
  return isSizeOutOfStockForVariant(variant, selectedSize);
}
