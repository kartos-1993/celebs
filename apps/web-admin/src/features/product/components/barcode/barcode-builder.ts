import { isPlaceholderVariant } from '@celebs/shared-utils';

import type { BarcodePrintItem } from './barcode-print-modal';

export const DEFAULT_STORE_NAME = 'CELEBS • NEW ROAD HUB';

/** Code 128-B encodes U+0020..U+007E only; every other code point is dropped. */
const NON_CODE128B_CHARS = /[^\x20-\x7E]/g;

export interface SkuEntry {
  skuCode?: string;
  code?: string;
  selectedOptions?: Record<string, string>;
  price?: number;
}

export interface BarcodeProductSource {
  id: string;
  name: string;
  price?: number | string;
  brand?: string | null;
  vendorName?: string | null;
  skus?: unknown;
}

export function getSkuPrefix(vendorName?: string | null, brand?: string | null): string {
  return (
    (vendorName || brand || 'HUB')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'HUB'
  );
}

function getStyleCode(id: string): string {
  return id.replace(/-/g, '').slice(-6).toUpperCase() || 'STD';
}

function toCode128BSku(value: string): string {
  return value.replace(NON_CODE128B_CHARS, '');
}

function getVariantLabel(selectedOptions?: Record<string, string>): string | undefined {
  const values = selectedOptions ? Object.values(selectedOptions) : [];
  const real = values.filter((val) => val && !isPlaceholderVariant(val));
  return real.length > 0 ? real.join(' / ') : undefined;
}

function toBarcodeItem(
  skuItem: SkuEntry,
  common: { storeName: string; productName: string },
  generatedSku: string,
  basePrice: number,
): BarcodePrintItem {
  const rawCode = skuItem.skuCode || skuItem.code || '';
  const customSku = toCode128BSku(rawCode.trim().toUpperCase());

  return {
    ...common,
    sku: customSku || generatedSku,
    variantLabel: getVariantLabel(skuItem.selectedOptions),
    price: Number(skuItem.price ?? basePrice),
  };
}

function getItemCommon(product: BarcodeProductSource): { storeName: string; productName: string } {
  return {
    storeName: product.vendorName || product.brand || DEFAULT_STORE_NAME,
    productName: product.name || 'Product',
  };
}

export function buildBarcodeItems(product?: BarcodeProductSource | null): BarcodePrintItem[] {
  if (!product) return [];

  const skus = Array.isArray(product.skus) ? (product.skus as SkuEntry[]) : undefined;
  const common = getItemCommon(product);
  const basePrice = Number(product.price ?? 0);
  const prefix = getSkuPrefix(product.vendorName, product.brand);
  const generatedSku = toCode128BSku(`CLB-${prefix}-${getStyleCode(product.id)}`);

  if (skus && skus.length > 0) {
    return skus.map((skuItem) => toBarcodeItem(skuItem, common, generatedSku, basePrice));
  }

  return [{ ...common, sku: generatedSku, price: basePrice }];
}

export function canPrintBarcodes(
  product?: { status?: string | null } | null,
  options?: { isEditMode?: boolean },
): boolean {
  if (options?.isEditMode) return true;
  return product?.status === 'published';
}
