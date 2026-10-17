import { describe, expect, it } from 'vitest';

import type { Product, ProductColorVariant } from '../../hooks/use-products';
import {
  getStockQtyForVariantSize,
  isProductFullyOutOfStock,
  isSelectedCombinationOutOfStock,
  isSizeOutOfStockForVariant,
  isVariantOutOfStock,
  resolveProductSizes,
  sizeForColorSwitch,
} from '../stock';

function variant(name: string, stocks?: { size: string; quantity: number }[]) {
  return { name, ...(stocks !== undefined ? { stocks } : {}) };
}

describe('resolveProductSizes — hierarchy and empty behavior', () => {
  it('returns [] for null/undefined/empty products', () => {
    expect(resolveProductSizes(null)).toEqual([]);
    expect(resolveProductSizes(undefined)).toEqual([]);
    expect(resolveProductSizes({})).toEqual([]);
    expect(resolveProductSizes({ colorVariants: [] })).toEqual([]);
  });

  it('filters Default sentinels from every tier', () => {
    // Single-variant catalogs declare a dummy 'default' size; every tier
    // strips it so the grid never renders a 'default' chip.
    expect(
      resolveProductSizes({
        sizes: [{ name: 'Default' }, { name: 'M' }],
      }),
    ).toEqual([{ name: 'M' }]);
    expect(
      resolveProductSizes({
        variantOptions: [{ name: 'Size', values: ['Default', 'L'] }],
      }),
    ).toEqual([{ name: 'L' }]);
    expect(
      resolveProductSizes({
        colorVariants: [variant('Default', [{ size: 'default', quantity: 5 }])],
      }),
    ).toEqual([]);
  });

  it('prefers explicit sizes over variantOptions over stocks', () => {
    const product = {
      sizes: [{ name: 'M' }],
      variantOptions: [{ name: 'Size', values: ['L'] }],
      colorVariants: [variant('Red', [{ size: 'S', quantity: 5 }])],
    };
    expect(resolveProductSizes(product)).toEqual([{ name: 'M' }]);
  });

  it('scopes to the selected variant when it declares sizes', () => {
    const product = {
      colorVariants: [
        variant('Red', [{ size: 'S', quantity: 5 }]),
        variant('Blue', [{ size: 'XL', quantity: 2 }]),
      ],
    };
    expect(resolveProductSizes(product, 0)).toEqual([{ name: 'S' }]);
    expect(resolveProductSizes(product, 1)).toEqual([{ name: 'XL' }]);
  });

  it('scopes to the selected variant (never the union) for an out-of-range index', () => {
    const product = {
      colorVariants: [
        variant('Red', [{ size: 'S', quantity: 5 }]),
        variant('Blue', [{ size: 'XL', quantity: 2 }]),
      ],
    };
    // A stale index (refetch returned fewer variants) resolves to no variant,
    // so the size grid must be empty rather than unioning every variant.
    expect(resolveProductSizes(product, 5)).toEqual([]);
    // With no index at all the union across variants is still the answer.
    expect(resolveProductSizes(product)).toEqual([{ name: 'S' }, { name: 'XL' }]);
  });

  it('returns [] when variants carry no stocks array', () => {
    expect(resolveProductSizes({ colorVariants: [variant('Red')] }, 0)).toEqual([]);
  });
});

describe('isVariantOutOfStock / isProductFullyOutOfStock — missing-stocks behavior', () => {
  it('treats a missing/empty stocks array as OUT OF STOCK (fail-closed)', () => {
    expect(isVariantOutOfStock(undefined)).toBe(true);
    expect(isVariantOutOfStock(variant('Red') as never)).toBe(true);
    expect(isVariantOutOfStock(variant('Red', []) as never)).toBe(true);
  });

  it('reports OOS only when every tracked entry is depleted', () => {
    expect(isVariantOutOfStock(variant('Red', [{ size: 'S', quantity: 0 }]) as never)).toBe(true);
    expect(
      isVariantOutOfStock(
        variant('Red', [
          { size: 'S', quantity: 0 },
          { size: 'M', quantity: 1 },
        ]) as never,
      ),
    ).toBe(false);
  });

  it('treats an entry with missing quantity as depleted', () => {
    const noQty = { name: 'Red', stocks: [{ size: 'S' }] } as unknown as ProductColorVariant;
    expect(isVariantOutOfStock(noQty)).toBe(true);
  });

  it('isProductFullyOutOfStock honors status flags and totals', () => {
    expect(isProductFullyOutOfStock(null)).toBe(false);
    expect(isProductFullyOutOfStock(undefined)).toBe(false);
    expect(
      isProductFullyOutOfStock({ id: 'p', status: 'out_of_stock' } as unknown as Product),
    ).toBe(true);
    expect(
      isProductFullyOutOfStock({ id: 'p', status: 'OUT_OF_STOCK' } as unknown as Product),
    ).toBe(true);
    expect(isProductFullyOutOfStock({ id: 'p', inStock: false } as unknown as Product)).toBe(true);
    expect(isProductFullyOutOfStock({ id: 'p', totalStock: 0 } as unknown as Product)).toBe(true);
  });

  it('isProductFullyOutOfStock is true when no variant tracks stock', () => {
    const product = { id: 'p', colorVariants: [variant('Red')] } as unknown as Product;
    expect(isProductFullyOutOfStock(product)).toBe(true);
  });

  it('isProductFullyOutOfStock requires every tracked variant to be OOS', () => {
    const allOos = {
      id: 'p',
      colorVariants: [
        variant('Red', [{ size: 'S', quantity: 0 }]),
        variant('Blue', [{ size: 'M', quantity: 0 }]),
      ],
    } as unknown as Product;
    const mixed = {
      id: 'p',
      colorVariants: [
        variant('Red', [{ size: 'S', quantity: 0 }]),
        variant('Blue', [{ size: 'M', quantity: 3 }]),
      ],
    } as unknown as Product;
    expect(isProductFullyOutOfStock(allOos)).toBe(true);
    expect(isProductFullyOutOfStock(mixed)).toBe(false);
  });
});

describe('getStockQtyForVariantSize / isSizeOutOfStockForVariant', () => {
  const red = variant('Red', [
    { size: 'S', quantity: 5 },
    { size: 'M', quantity: 0 },
  ]) as never;

  it('returns null when stock is untracked or the size is absent', () => {
    expect(getStockQtyForVariantSize(undefined, 'S')).toBeNull();
    expect(getStockQtyForVariantSize(variant('Red') as never, 'S')).toBeNull();
    expect(getStockQtyForVariantSize(red, 'XL')).toBeNull();
  });

  it('matches size names case-insensitively and returns zero stock verbatim', () => {
    expect(getStockQtyForVariantSize(red, 's')).toBe(5);
    expect(getStockQtyForVariantSize(red, 'm')).toBe(0);
  });

  it('flags an untracked size and an untracked variant as OOS (fail-closed)', () => {
    expect(isSizeOutOfStockForVariant(red, 'M')).toBe(true);
    expect(isSizeOutOfStockForVariant(red, 'S')).toBe(false);
    expect(isSizeOutOfStockForVariant(red, 'XL')).toBe(true);
    expect(isSizeOutOfStockForVariant(undefined, 'S')).toBe(true);
  });
});

describe('sizeForColorSwitch — what a color switch may carry over', () => {
  it('keeps a size the incoming variant stocks', () => {
    const both = {
      colorVariants: [
        variant('Red', [{ size: 'S', quantity: 5 }]),
        variant('Blue', [{ size: 'S', quantity: 2 }]),
      ],
    };
    expect(sizeForColorSwitch('S', both.colorVariants?.[1])).toBe('S');
  });

  it('clears a size the incoming variant cannot sell', () => {
    const split = {
      colorVariants: [
        variant('Red', [{ size: 'S', quantity: 5 }]),
        variant('Blue', [{ size: 'M', quantity: 3 }]),
      ],
    };
    expect(sizeForColorSwitch('S', split.colorVariants?.[1])).toBe('');
    expect(sizeForColorSwitch('S', undefined)).toBe('');
  });

  it('clears a depleted size and any placeholder selection', () => {
    const depleted = variant('Blue', [{ size: 'S', quantity: 0 }]) as never;
    expect(sizeForColorSwitch('S', depleted)).toBe('');
    expect(sizeForColorSwitch('Default', depleted)).toBe('');
    expect(sizeForColorSwitch('Standard', depleted)).toBe('');
  });
});

describe('isSelectedCombinationOutOfStock vs cart OOS-check skip', () => {
  const product = {
    id: 'p',
    colorVariants: [
      variant('Red', [{ size: 'S', quantity: 0 }]),
      variant('Blue', [{ size: 'M', quantity: 4 }]),
    ],
  } as unknown as Product;

  it('falls back to variant-level OOS when no size is chosen', () => {
    expect(isSelectedCombinationOutOfStock(product, 0, '')).toBe(true);
    expect(isSelectedCombinationOutOfStock(product, 1, '')).toBe(false);
  });

  it('checks the exact size when one is chosen', () => {
    expect(isSelectedCombinationOutOfStock(product, 0, 'S')).toBe(true);
    expect(isSelectedCombinationOutOfStock(product, 1, 'M')).toBe(false);
  });

  it('treats an out-of-range variant index as OOS but a missing product as unknown', () => {
    expect(isSelectedCombinationOutOfStock(null, 0, 'S')).toBe(false);
    expect(isSelectedCombinationOutOfStock(product, 9, 'S')).toBe(true);
  });

  it('the cart judges the variant instead of defaulting to in-stock with no size', () => {
    // Mirrors use-product-detail-cart.ts:
    //   const isFreshOos = finalSize ? isSizeOutOfStockForVariant(...) : isVariantOutOfStock(...);
    const depleted = product.colorVariants?.[0];
    const finalSize = '';
    const isFreshOos = finalSize
      ? isSizeOutOfStockForVariant(depleted, finalSize)
      : isVariantOutOfStock(depleted);
    expect(isFreshOos).toBe(true);
  });
});
