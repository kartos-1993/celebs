import type { Product, ProductColorVariant, ProductSize } from '../hooks/use-products';

export function isVariantOutOfStock(variant: ProductColorVariant | undefined): boolean {
  if (!variant) return false;
  // No stocks array => stock not tracked per-variant, treat as in-stock
  if (!Array.isArray(variant.stocks) || variant.stocks.length === 0) return false;
  return variant.stocks.every((s) => (s.quantity ?? 0) <= 0);
}

export function isProductFullyOutOfStock(product: Product | null | undefined): boolean {
  if (!product) return false;
  const prodRec = product as Product & Record<string, unknown>;

  // Check explicit status flags
  if (prodRec.status === 'out_of_stock' || prodRec.status === 'OUT_OF_STOCK') {
    return true;
  }
  if (prodRec.inStock === false || prodRec.isAvailable === false) {
    return true;
  }
  const totalStock = prodRec.totalStock ?? prodRec.stock;
  if (typeof totalStock === 'number' && totalStock <= 0) {
    return true;
  }

  const variants = product.colorVariants;
  if (!Array.isArray(variants) || variants.length === 0) return false;

  // Product is fully OOS only if variants have tracked stock and every variant is OOS
  const trackedVariants = variants.filter((v) => Array.isArray(v.stocks) && v.stocks.length > 0);
  if (trackedVariants.length > 0) {
    return trackedVariants.every(isVariantOutOfStock);
  }

  return false;
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
    return isVariantOutOfStock(variant);
  }
  return isSizeOutOfStockForVariant(variant, selectedSize);
}

/**
 * Last-resort display sizes: when the product payload carries no `sizes`
 * array but variants track per-size stock, derive the size list from the
 * union of stock entries so the PDP can never render sizeless while stock
 * data exists. Entries carry no measurements — names and quantities only.
 */
export function deriveSizesFromStocks(product: Product | null | undefined): ProductSize[] {
  if (product?.sizes && product.sizes.length > 0) return product.sizes;
  const seen = new Map<string, string>();
  for (const variant of product?.colorVariants ?? []) {
    for (const stock of variant.stocks ?? []) {
      const name = stock.size?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.set(name.toLowerCase(), name);
      }
    }
  }
  return [...seen.values()].map((name) => ({ name }));
}
