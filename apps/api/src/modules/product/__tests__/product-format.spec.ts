// Pins UNIFIED formatProductResponse output on shared fixtures (the fix).
import { describe, expect, it } from 'vitest';

import { formatProductResponse } from '../product-format';

import {
  baseRow,
  carrierOnlyRow,
  carrierPlusColorRow,
  categoryObjectRow,
  dynamicSwatchRow,
  emptyStockRow,
  invalidDiscountRow,
  legacyNoSwatchRow,
  legacySwatchRow,
  liveInventoryRow,
  noCategoryObjectRow,
  zeroStockRow,
} from './presenter-fixtures';

function present(
  row: Record<string, unknown>,
  options?: { isElevated?: boolean },
): Record<string, unknown> {
  const out = formatProductResponse(row, options);
  if (!out) throw new Error('expected non-null presenter output');
  return out;
}

/**
 * First entry of a presenter array, asserted present. These suites index
 * position 0 on purpose, so the assertion belongs here rather than behind an
 * `!` (which lint flags) or an optional chain (which would let an empty array
 * pass a `toBeUndefined()` check).
 */
function firstVariant(base: Record<string, unknown>): Record<string, unknown> {
  const variants = base.colorVariants as Array<Record<string, unknown>>;
  expect(variants.length).toBeGreaterThan(0);
  return variants[0] as Record<string, unknown>;
}

// The zod schema stays strict on purpose (colorCode required, `url()`-only
// swatch/images, UUID categoryId/subcategoryId). These presenters are a READ
// path: they surface stored data and never validate, invent, or coerce a payload
// the schema already rejected. Each strict rule is pinned below together with
// the client work that still has to satisfy it.

describe('strict zod rules (read path, not validation)', () => {
  // WONTFIX: client must satisfy `colorVariantSchema.colorCode` (required).
  it('surfaces an undefined colorCode instead of inventing one', () => {
    const dynamic = present(
      baseRow({
        dynamicData: { variants: { colorMeta: { Red: { name: 'Red', images: [] } } } },
      }),
    );
    expect(firstVariant(dynamic).colorCode).toBeUndefined();

    const legacy = present(
      baseRow({ colorVariants: [{ name: 'Red', colorCode: '', images: [] }] }),
    );
    expect(firstVariant(legacy).colorCode).toBeUndefined();
  });

  // WONTFIX: client must satisfy `colorVariantSchema` `url()`-only swatch/images.
  it('passes non-url stored image strings through verbatim (no URL validation here)', () => {
    const base = present(
      baseRow({
        colorVariants: [
          { name: 'Red', colorCode: '#ff0000', swatch: '/local/swatch.png', images: ['red.png'] },
        ],
      }),
    );

    expect(firstVariant(base).swatch).toBe('/local/swatch.png');
    expect(firstVariant(base).images).toEqual(['red.png']);
  });

  // WONTFIX: client must satisfy `idSchema` (UUID) for categoryId/subcategoryId.
  it('never turns a non-UUID categoryId into a category object', () => {
    const base = present(baseRow({ categoryId: 'not-a-uuid', subcategoryId: 'not-a-uuid' }));

    expect(base.categoryId).toBe('not-a-uuid');
    expect(base.category).toBeNull();
    expect(base.subcategory).toBeNull();
  });
});

describe('the size-only carrier is plumbing, not a colour', () => {
  it('emits no variant and declares the axis absent, instead of a "Default" colour', () => {
    const base = present(carrierOnlyRow());

    expect(base.colorVariants).toEqual([]);
    expect(base.hasColorAxis).toBe(false);
  });

  it('still reports the stock the carrier row holds', () => {
    // Stock is read before the carrier is dropped: this is the only place a
    // colourless product's quantity is recorded.
    expect(present(carrierOnlyRow()).inStock).toBe(true);
  });

  it('keeps a real colour and declares the axis present', () => {
    const base = present(legacySwatchRow());

    expect(base.hasColorAxis).toBe(true);
    expect(firstVariant(base).name).toBe('Red');
  });

  it('drops the carrier beside a real colour, keeping the colour and the axis', () => {
    // Mixed storage: the filter is per-variant, so one stored carrier must not
    // cost a real colour its place (or flip the axis to absent).
    const base = present(carrierPlusColorRow());

    expect(base.hasColorAxis).toBe(true);
    expect((base.colorVariants as Array<Record<string, unknown>>).map((v) => v.name)).toEqual([
      'Red',
    ]);
  });

  it('declares the axis absent for a product that stores no variant at all', () => {
    expect(present(emptyStockRow()).hasColorAxis).toBe(false);
  });
});

describe('formatProductResponse (base layer)', () => {
  it('keeps stored dynamic colorMeta images without prepending the swatch', () => {
    const base = present(dynamicSwatchRow());
    const variants = base.colorVariants as Array<Record<string, unknown>>;

    expect(variants).toHaveLength(1);
    expect(firstVariant(base)).toEqual({
      name: 'Red',
      colorCode: '#ff0000',
      swatch: 'sw-red.jpg',
      images: ['red-1.jpg'],
      stocks: [{ size: 'M', quantity: 2 }],
    });
  });

  it('keeps legacy variant images exactly as stored without prepending the swatch', () => {
    const base = present(legacySwatchRow());

    expect(firstVariant(base).swatch).toBe('sw-red.jpg');
    expect(firstVariant(base).images).toEqual(['red-1.jpg', 'red-2.jpg']);
  });

  it('surfaces an undefined swatch when no swatch was stored', () => {
    const base = present(legacyNoSwatchRow());

    expect(firstVariant(base).swatch).toBeUndefined();
    expect(firstVariant(base).images).toEqual(['red-1.jpg']);
  });

  it('defaults untracked-stock products to inStock false', () => {
    expect(present(emptyStockRow()).inStock).toBe(false);
    expect(present(baseRow({ colorVariants: [{ name: 'X', stocks: [] }] })).inStock).toBe(false);
  });

  it('reports inStock false when every tracked stock quantity is zero', () => {
    expect(present(zeroStockRow()).inStock).toBe(false);
  });

  it('reports inStock true when any tracked stock quantity is positive', () => {
    expect(present(dynamicSwatchRow()).inStock).toBe(true);
  });

  it('hides discountedPrice when it is at or above the base price', () => {
    const base = present(invalidDiscountRow());

    expect(base.price).toBe(2000);
    expect(base.discountedPrice).toBeUndefined();
  });

  it('keeps a loaded category object as-is', () => {
    const base = present(categoryObjectRow());

    expect(base.category).toEqual({ id: 'c1', name: 'Denim', imageUrl: 'cat.jpg' });
  });

  it('nulls category relations when no relation object is loaded', () => {
    const base = present(noCategoryObjectRow());

    expect(base.category).toBeNull();
    expect(base.subcategory).toBeNull();
  });

  it('merges live inventory quantities, strips raw inventories, and scrubs staff fields', () => {
    const base = present(liveInventoryRow());

    expect(firstVariant(base).stocks).toEqual([{ size: 'M', quantity: 4 }]);
    expect('inventories' in base).toBe(false);
    expect(base.reviewNote).toBeUndefined();

    const elevated = present(liveInventoryRow(), { isElevated: true });
    expect(elevated.reviewNote).toBe('needs a second look');
  });
});
