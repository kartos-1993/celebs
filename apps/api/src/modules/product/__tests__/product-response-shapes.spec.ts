// Pins UNIFIED downstream shape outputs
// (formatStorefrontCard / formatStorefrontDetail / formatAdminProductListItem /
// formatAdminDetail) on the SAME fixtures as the base layer (the fix).
import { describe, expect, it } from 'vitest';

import { formatProductResponse } from '../product-format';
import {
  formatAdminDetail,
  formatAdminProductListItem,
  formatStorefrontCard,
  formatStorefrontDetail,
} from '../product-response-shapes';

import {
  adminSkuRow,
  baseRow,
  carrierOnlyRow,
  categoryObjectRow,
  comboRow,
  dynamicSwatchRow,
  emptyStockRow,
  invalidDiscountRow,
  leadingSwatchDupeRow,
  legacySwatchRow,
  noCategoryObjectRow,
  noCoverRow,
  sizesFallbackRow,
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
 * Indexed read with the presence asserted. These suites reach into a fixed
 * position on purpose, so the check belongs here rather than behind an `!`
 * (lint-flagged) or an optional chain (which would let a short array pass a
 * `toBeUndefined()` assertion).
 */
function at<T>(list: T[], index: number): T {
  expect(list.length).toBeGreaterThan(index);
  return list[index] as T;
}

// The zod schema stays strict on purpose (`skuItemSchema.price` positive,
// `skuItemSchema.image` `url()`-only, UUID category ids). These presenters are a
// READ path, so they surface what was stored and never coerce a rejected
// payload — hence a null `price` (contract change) instead of a base-price
// fallback, and a verbatim stored image string.

describe('downstream shape (presenters layer)', () => {
  it('strips a leading swatch duplicate in both PDP detail and grid cards', () => {
    const base = present(dynamicSwatchRow());

    const detail = formatStorefrontDetail(base);
    expect(at(detail.colorVariants, 0).swatch).toBe('sw-red.jpg');
    expect(at(detail.colorVariants, 0).images).toEqual(['red-1.jpg']);

    const card = formatStorefrontCard(base);
    expect(card.colorVariants[0]).toEqual({
      name: 'Red',
      images: ['red-1.jpg'],
    });
  });

  it('strips a real leading swatch duplicate for the storefront but NOT for admin', () => {
    // The strip is PRESENTATION-only. Card/PDP are display surfaces, so hiding
    // the swatch photo (already rendered as its own swatch) is correct there.
    const base = present(leadingSwatchDupeRow());

    expect(at(formatStorefrontDetail(base).colorVariants, 0).images).toEqual([
      'red-1.jpg',
      'red-2.jpg',
    ]);
    expect(at(formatStorefrontCard(base).colorVariants, 0).images).toEqual([
      'red-1.jpg',
      'red-2.jpg',
    ]);

    // The admin detail is an EDIT surface: the form hydrates `colorVariants`
    // and POSTS it back, so stripping here deleted one stored image from the
    // saved gallery on every save that did not touch images. Verbatim.
    const admin = formatAdminDetail(base);
    expect(at(admin.colorVariants as Array<Record<string, unknown>>, 0).images).toEqual([
      'sw-red.jpg',
      'red-1.jpg',
      'red-2.jpg',
    ]);
    // The cover still resolves from the RAW (pre-strip) gallery.
    expect(admin.cover).toBe('sw-red.jpg');
  });

  it('keeps legacy images identical across card and detail when no prepend happened', () => {
    const base = present(legacySwatchRow());

    expect(at(formatStorefrontDetail(base).colorVariants, 0).images).toEqual([
      'red-1.jpg',
      'red-2.jpg',
    ]);
    expect(at(formatStorefrontCard(base).colorVariants, 0).images).toEqual([
      'red-1.jpg',
      'red-2.jpg',
    ]);
  });

  it('hides an invalid discountedPrice (>= price) in every downstream shape', () => {
    const base = present(invalidDiscountRow());
    expect(base.discountedPrice).toBeUndefined();

    expect(formatStorefrontDetail(base).discountedPrice).toBeUndefined();
    expect(formatStorefrontCard(base).discountedPrice).toBeUndefined();
    expect(formatAdminDetail(base).discountedPrice).toBeUndefined();
    expect(formatAdminProductListItem(base).discountedPrice).toBeUndefined();
  });

  it('shows a valid discountedPrice (< price) in every downstream shape', () => {
    const base = present(baseRow());

    expect(formatStorefrontDetail(base).discountedPrice).toBe(1800);
    expect(formatStorefrontCard(base).discountedPrice).toBe(1800);
    expect(formatAdminDetail(base).discountedPrice).toBe(1800);
    expect(formatAdminProductListItem(base).discountedPrice).toBe(1800);
  });

  it('respects inventory/client isDefault flags over row index', () => {
    const admin = formatAdminDetail(adminSkuRow());
    const skus = admin.skus as Array<Record<string, unknown>>;

    expect(skus).toHaveLength(2);
    expect(skus[0]).toMatchObject({ skuCode: 'SKU-RED-M', isDefault: false });
    expect(skus[1]).toMatchObject({ skuCode: 'SKU-GRN-S', isDefault: true });
  });

  it('falls back to row-index-0 isDefault only when no flag exists anywhere', () => {
    const admin = formatAdminDetail(
      baseRow({
        price: 2000,
        inventories: [
          { colorVariantName: 'Red', size: 'M', quantity: 3, sku: 'SKU-RED-M' },
          { colorVariantName: 'Green', size: 'S', quantity: 2, sku: 'SKU-GRN-S' },
        ],
        skus: [
          { selectedOptions: { Color: 'Red', Size: 'M' }, price: 2100, stock: 3 },
          { selectedOptions: { Color: 'Green', Size: 'S' }, price: 2200, stock: 2 },
        ],
      }),
    );
    const skus = admin.skus as Array<Record<string, unknown>>;

    expect(skus).toHaveLength(2);
    expect(skus[0]).toMatchObject({ skuCode: 'SKU-RED-M', isDefault: true });
    expect(skus[1]).toMatchObject({ skuCode: 'SKU-GRN-S', isDefault: false });
  });

  // CONTRACT CHANGE: SKU price may be null (never the base price).
  it('surfaces a null price for inventory SKUs with no matching SKU entry', () => {
    const admin = formatAdminDetail(adminSkuRow());
    const skus = admin.skus as Array<Record<string, unknown>>;

    expect(skus[0]).toMatchObject({ price: 2100, discountedPrice: 1900, stock: 3 });
    expect(skus[1]).toMatchObject({
      price: null,
      stock: 2,
      selectedOptions: { Color: 'Green', Size: 'S' },
    });
    expect(at(skus, 1).discountedPrice).toBeUndefined();
  });

  it('keeps missing stock at 0 with the fallback reason recorded', () => {
    const admin = formatAdminDetail(
      baseRow({
        price: 2000,
        inventories: [{ colorVariantName: 'Red', size: 'M', sku: 'SKU-RED-M' }],
        skus: [{ selectedOptions: { Color: 'Red', Size: 'M' }, price: 2100, stock: 3 }],
      }),
    );
    const skus = admin.skus as Array<Record<string, unknown>>;

    // Reason: no usable inventory quantity was supplied, so stock falls back to 0.
    expect(skus[0]).toMatchObject({ skuCode: 'SKU-RED-M', stock: 0 });
  });

  it('normalizes raw skus deterministically on the pipeline path where inventories were stripped', () => {
    const admin = formatAdminDetail(present(adminSkuRow(), { isElevated: true }));
    const skus = admin.skus as Array<Record<string, unknown>>;

    expect(skus).toHaveLength(1);
    expect(skus[0]).toMatchObject({ price: 2100, discountedPrice: 1900, stock: 3 });
    expect(at(skus, 0).isDefault).toBe(false);
  });

  it('clamps invalid discounts on the raw-skus pipeline path', () => {
    const admin = formatAdminDetail(
      present(
        baseRow({
          price: 2000,
          discountedPrice: 2500,
          skus: [
            { selectedOptions: { Color: 'Red', Size: 'M' }, price: 2100, discountedPrice: 2600 },
          ],
        }),
        { isElevated: true },
      ),
    );
    const skus = admin.skus as Array<Record<string, unknown>>;

    expect(admin.discountedPrice).toBeUndefined();
    expect(at(skus, 0).discountedPrice).toBeUndefined();
    expect(at(skus, 0).price).toBe(2100);
  });

  it('nulls non-object categories in every detail shape', () => {
    const base = present(noCategoryObjectRow());

    expect(formatStorefrontDetail(base).category).toBeNull();
    expect(formatStorefrontDetail(base).subcategory).toBeNull();
    expect(formatAdminDetail(base).category).toBeNull();
  });

  it('nulls a raw UUID category in the admin list while keeping loaded objects', () => {
    expect(formatAdminProductListItem(present(noCategoryObjectRow())).category).toBeNull();

    const withObject = formatAdminProductListItem(present(categoryObjectRow()));
    expect(withObject.category).toEqual({ id: 'c1', name: 'Denim', imageUrl: 'cat.jpg' });

    const detailObject = formatStorefrontDetail(present(categoryObjectRow()));
    expect(detailObject.category).toEqual({ id: 'c1', name: 'Denim', imageUrl: 'cat.jpg' });
  });

  it('prefers mainImages for cover, then undefined when no image exists', () => {
    expect(formatStorefrontCard(present(baseRow())).cover).toBe('cover.jpg');
    expect(formatStorefrontDetail(present(baseRow())).cover).toBe('cover.jpg');
    expect(formatStorefrontCard(present(noCoverRow())).cover).toBeUndefined();
    expect(formatAdminDetail(present(noCoverRow())).cover).toBeUndefined();
  });

  it('resolves variant-image cover identically in card, PDP detail, and admin shapes', () => {
    const base = present(sizesFallbackRow());

    expect(formatStorefrontCard(base).cover).toBe('red-1.jpg');
    expect(formatAdminDetail(base).cover).toBe('red-1.jpg');
    expect(formatAdminProductListItem(base).cover).toBe('red-1.jpg');
    expect(formatStorefrontDetail(base).cover).toBe('red-1.jpg');
  });

  it('derives combo prices, ranges, size fallback, and stock totals from the same row', () => {
    const detail = formatStorefrontDetail(present(comboRow()));
    expect(detail.comboPrices).toHaveLength(2);
    expect(detail.priceRange).toEqual({ min: 1900, max: 2300 });
    expect(detail.minDiscounted).toBe(1900);
    expect(detail.sizes).toEqual([{ name: 'S', productMeasurements: [], bodyMeasurements: [] }]);

    const card = formatStorefrontCard(present(comboRow()));
    expect(card.minPrice).toBe(1900);
    expect(card.minDiscounted).toBe(1900);

    expect(formatAdminProductListItem(present(comboRow())).stockTotal).toBe(10);
    expect(formatAdminProductListItem(present(sizesFallbackRow())).stockTotal).toBe(2);
    expect(formatStorefrontDetail(present(sizesFallbackRow())).sizes).toEqual([{ name: 'M' }]);
  });

  it('falls back to the base price range when no SKU entries exist', () => {
    const detail = formatStorefrontDetail(present(emptyStockRow()));

    expect(detail.comboPrices).toEqual([]);
    expect(detail.priceRange).toEqual({ min: 2000, max: 2000 });
    expect(detail.minDiscounted).toBe(1800);
  });

  it('never serves the size-only carrier as a colour', () => {
    // The carrier exists in storage (inventory rows + the publish floor need
    // it) but the storefront gets an empty list instead of a fake "Default"
    // colour. The cover still resolves from the product gallery.
    const base = present(carrierOnlyRow());

    expect(formatStorefrontCard(base).colorVariants).toEqual([]);
    expect(formatStorefrontDetail(base).colorVariants).toEqual([]);
    expect(formatStorefrontDetail(base).cover).toBe('cover.jpg');
    expect(formatStorefrontDetail(base).inStock).toBe(true);
  });

  it('treats a missing inStock flag as false downstream and respects an explicit true', () => {
    expect(formatStorefrontCard(present(emptyStockRow())).inStock).toBe(false);
    expect(formatStorefrontDetail(present(emptyStockRow())).inStock).toBe(false);
    expect(formatStorefrontDetail(present(zeroStockRow())).inStock).toBe(false);

    const withoutFlag = { ...present(emptyStockRow()), inStock: undefined };
    expect(formatStorefrontCard(withoutFlag).inStock).toBe(false);
    expect(formatStorefrontDetail({ ...present(dynamicSwatchRow()), inStock: true }).inStock).toBe(
      true,
    );
  });
});
