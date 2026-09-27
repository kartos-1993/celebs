import { describe, expect, it } from 'vitest';

import { sanitizeVariantKey } from '../../../utils/add-product-helpers';
import type { VariantSelection } from '../sku-table-types';
import * as skuTableUtils from '../sku-table-utils';

const twoAxis: VariantSelection[] = [
  { key: 'color', label: 'Color', values: ['red', 'blue'] },
  { key: 'size', label: 'Size', values: ['S', 'M', 'L'] },
];

const labelOf = (axisKey: string, value: string) => {
  if (axisKey === 'color') return value === 'red' ? 'Red' : 'Blue';
  return value;
};

const {
  buildScopeOptions,
  collectSkuItems,
  collectSkuPaths,
  getNestedValue,
  getSkuButtonState,
  matchesScope,
  pathFor,
} = skuTableUtils;

describe('sanitize + pathFor', () => {
  it('verbatim-duplicate sanitize() is deleted; pathFor uses sanitizeVariantKey', () => {
    // sanitize() duplicating sanitizeVariantKey was deleted and pathFor
    // repoints to sanitizeVariantKey (its only caller).
    expect((skuTableUtils as Record<string, unknown>).sanitize).toBeUndefined();
    expect(pathFor('Size', '28.5', 'price')).toBe(
      `sku.variants.Size.${sanitizeVariantKey('28.5')}.price`,
    );
  });

  it('pathFor prefixes sku.variants and sanitizes every segment', () => {
    expect(pathFor('Color', 'Red', 'price')).toBe('sku.variants.Color.Red.price');
    expect(pathFor('Size', '28.5', 'price')).toBe('sku.variants.Size.28_5.price');
    expect(pathFor('Color', 'Red', 'Size', 'S', 'stock')).toBe(
      'sku.variants.Color.Red.Size.S.stock',
    );
  });
});

describe('matchesScope + buildScopeOptions', () => {
  it('matchesScope handles ALL, single-axis, and ordered combos', () => {
    expect(matchesScope('ALL', 'color', 'red', 'size', 'S')).toBe(true);
    expect(matchesScope('color::red', 'color', 'red', 'size', 'S')).toBe(true);
    expect(matchesScope('color::red', 'color', 'blue', 'size', 'S')).toBe(false);
    expect(matchesScope('size::M', 'color', 'blue', 'size', 'M')).toBe(true);
    expect(matchesScope('size::M', 'color', 'blue', 'size', 'L')).toBe(false);
    expect(matchesScope('color::red||size::M', 'color', 'red', 'size', 'M')).toBe(true);
    expect(matchesScope('color::red||size::M', 'color', 'red', 'size', 'S')).toBe(false);
    expect(matchesScope('color::red||size::M', 'size', 'M', 'color', 'red')).toBe(true);
  });

  it('buildScopeOptions emits ALL plus per-axis and combo entries', () => {
    expect(buildScopeOptions([], labelOf)).toEqual([{ value: 'ALL', label: 'All Variants' }]);
    const single = buildScopeOptions([twoAxis[0]], labelOf);
    expect(single[0]).toEqual({ value: 'ALL', label: 'All Variants' });
    expect(single).toContainEqual({ value: 'color::red', label: 'Color: Red' });
    const full = buildScopeOptions(twoAxis, labelOf);
    // 1 ALL + 2 colors + 3 sizes + 6 combos
    expect(full).toHaveLength(12);
    expect(full).toContainEqual({
      value: 'color::red',
      label: 'Color: Red (All Sizes)',
    });
    expect(full).toContainEqual({ value: 'size::S', label: 'Size: S (All Colors)' });
    expect(full).toContainEqual({ value: 'color::red||size::S', label: 'Red × S' });
  });
});

describe('collectSkuItems', () => {
  it('returns the default sellerSku path when no variants exist', () => {
    expect(collectSkuItems([])).toEqual([{ path: 'sku.default.sellerSku', options: [] }]);
    expect(collectSkuPaths([])).toEqual(['sku.default.sellerSku']);
  });

  it('is explicitly sellerSku-scoped (price/stock live in validation + payload)', () => {
    const single: VariantSelection[] = [{ key: 'size', label: 'Size', values: ['S', 'M'] }];
    const items = collectSkuItems(single);
    // the fix decision (fix #10): the only consumer is the SKU auto-generate
    // flow in use-sku-table; price/stock/availability are validated per row by
    // collectPricingErrors and read by buildPayloadSkus, so this helper stays
    // sellerSku-only by documented contract instead of tracking every cell.
    expect(items).toEqual([
      { path: 'sku.variants.size.S.sellerSku', options: ['S'] },
      { path: 'sku.variants.size.M.sellerSku', options: ['M'] },
    ]);
    expect(items.every((item) => item.path.endsWith('.sellerSku'))).toBe(true);
    const cross = collectSkuItems(twoAxis);
    expect(cross).toHaveLength(6);
    expect(cross[0]).toEqual({
      path: 'sku.variants.color.red.size.S.sellerSku',
      options: ['red', 'S'],
    });
  });
});

describe('getSkuButtonState + getNestedValue', () => {
  it('getSkuButtonState labels all-assigned, none-assigned, and partial states', () => {
    expect(getSkuButtonState(0, 0)).toMatchObject({
      label: 'All SKUs Assigned',
      isDisabled: true,
      icon: 'check',
    });
    expect(getSkuButtonState(6, 0)).toMatchObject({
      label: 'All SKUs Assigned',
      isDisabled: true,
      icon: 'check',
    });
    expect(getSkuButtonState(6, 6)).toMatchObject({
      label: 'Auto-Generate SKUs',
      isDisabled: false,
      icon: 'sparkles',
    });
    expect(getSkuButtonState(6, 2)).toMatchObject({
      label: 'Generate Missing (2)',
      isDisabled: false,
      icon: 'sparkles',
    });
  });

  it('sku-table getNestedValue is flat-key-aware (unified with helpers)', () => {
    const nested = { sku: { default: { sellerSku: 'ABC' } } };
    expect(getNestedValue(nested, 'sku.default.sellerSku')).toBe('ABC');
    // fix (#11): unified into the helpers flat-key-aware version —
    // flat dot-keys resolve too, and win over deep traversal on conflict.
    expect(getNestedValue({ 'sku.default.sellerSku': 'ABC' }, 'sku.default.sellerSku')).toBe('ABC');
    expect(
      getNestedValue(
        { 'sku.default.sellerSku': 'FLAT', sku: { default: { sellerSku: 'NESTED' } } },
        'sku.default.sellerSku',
      ),
    ).toBe('FLAT');
    expect(getNestedValue(nested, 'sku.default.missing')).toBeUndefined();
    expect(getNestedValue(null, 'sku.default.sellerSku')).toBeUndefined();
    expect(getNestedValue('nope', 'sku.default.sellerSku')).toBeUndefined();
  });

  it('collectApplyPaths targets every in-scope combo across N axes', () => {
    const { collectApplyPaths } = skuTableUtils;
    // ALL scope covers the full cross product.
    expect(collectApplyPaths(twoAxis, 'ALL')).toHaveLength(6);
    expect(collectApplyPaths(twoAxis, 'ALL')[0]).toEqual(['color', 'red', 'size', 'S']);
    // Single-axis scope matches any combo containing that pair.
    expect(collectApplyPaths(twoAxis, 'color::red')).toHaveLength(3);
    expect(collectApplyPaths(twoAxis, 'size::M')).toHaveLength(2);
    // Combo scope matches exactly one cell (either axis order).
    expect(collectApplyPaths(twoAxis, 'color::red||size::M')).toEqual([
      ['color', 'red', 'size', 'M'],
    ]);
    expect(collectApplyPaths(twoAxis, 'size::M||color::red')).toEqual([
      ['color', 'red', 'size', 'M'],
    ]);
    // Single-axis selections and empty selections behave.
    expect(collectApplyPaths([{ key: 'size', label: 'Size', values: ['S', 'M'] }], 'ALL')).toEqual([
      ['size', 'S'],
      ['size', 'M'],
    ]);
    expect(collectApplyPaths([], 'ALL')).toEqual([]);
    // Third axis generalizes instead of silently pruning.
    const three: VariantSelection[] = [
      ...twoAxis,
      { key: 'material', label: 'Material', values: ['Cotton', 'Silk'] },
    ];
    expect(collectApplyPaths(three, 'ALL')).toHaveLength(12);
    expect(collectApplyPaths(three, 'material::Silk')).toHaveLength(6);
  });

  it('parseVariantAxesResponse accepts every known envelope and throws otherwise', () => {
    const { parseVariantAxesResponse } = skuTableUtils;
    const axes = [{ key: 'Color', label: 'Color' }];
    expect(parseVariantAxesResponse({ data: { variants: axes } })).toEqual(axes);
    expect(parseVariantAxesResponse({ variants: axes })).toEqual(axes);
    expect(parseVariantAxesResponse({ data: { axes } })).toEqual(axes);
    expect(parseVariantAxesResponse({ axes })).toEqual(axes);
    expect(parseVariantAxesResponse({ data: axes })).toEqual(axes);
    expect(parseVariantAxesResponse(axes)).toEqual(axes);
    expect(() => parseVariantAxesResponse(null)).toThrow(/unexpected variant API shape/);
    expect(() => parseVariantAxesResponse({ data: { unexpected: [] } })).toThrow(
      /unexpected variant API shape/,
    );
    expect(() => parseVariantAxesResponse({ data: { variants: {} } })).toThrow(/expected an array/);
  });
});
