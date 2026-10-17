import { describe, expect, it, vi } from 'vitest';

import {
  APPLY_ALL_FIELD_NAMES,
  collectApplyAssignments,
  collectApplyPaths,
  countBlankSkuCodes,
  fillMissingSkuCodes,
  normalizeVariantMetaItem,
  parseVariantAxesResponse,
  toVariantSelection,
} from '../apply-sku-scope';
import type { VariantSelection } from '../sku-table-types';

const twoAxis: VariantSelection[] = [
  { key: 'color', label: 'Color', values: ['red', 'blue'] },
  { key: 'size', label: 'Size', values: ['S', 'M'] },
];

describe('APPLY_ALL_FIELD_NAMES', () => {
  it('is exactly the four persistable batch-editable cells', () => {
    // fix: the bar used to collect freeItems/available, which
    // skuItemSchema drops server-side. One direction: batch-apply never
    // writes them, so the list is the persistable contract.
    expect(APPLY_ALL_FIELD_NAMES).toEqual(['price', 'specialPrice', 'stock', 'sellerSku']);
  });
});

describe('collectApplyPaths', () => {
  it('returns the row-major cross product for an ALL scope', () => {
    // fix: 1-axis and 2-axis were hardcoded; the N-axis cross product
    // is the same code path.
    expect(collectApplyPaths(twoAxis, 'ALL')).toEqual([
      ['color', 'red', 'size', 'S'],
      ['color', 'red', 'size', 'M'],
      ['color', 'blue', 'size', 'S'],
      ['color', 'blue', 'size', 'M'],
    ]);
  });

  it('filters by single-axis, combo, and N-axis scopes', () => {
    expect(collectApplyPaths(twoAxis, 'color::blue')).toEqual([
      ['color', 'blue', 'size', 'S'],
      ['color', 'blue', 'size', 'M'],
    ]);
    expect(collectApplyPaths(twoAxis, 'size::S')).toEqual([
      ['color', 'red', 'size', 'S'],
      ['color', 'blue', 'size', 'S'],
    ]);
    expect(collectApplyPaths(twoAxis, 'size::S||color::blue')).toEqual([
      ['color', 'blue', 'size', 'S'],
    ]);
    // Unknown value in the scope matches nothing (never throws).
    expect(collectApplyPaths(twoAxis, 'color::green')).toEqual([]);
    const three: VariantSelection[] = [
      ...twoAxis,
      { key: 'material', label: 'Material', values: ['Cotton', 'Silk'] },
    ];
    expect(collectApplyPaths(three, 'ALL')).toHaveLength(8);
    expect(collectApplyPaths(three, 'material::Silk')).toHaveLength(4);
    expect(collectApplyPaths(three, 'material::Silk||color::red||size::M')).toEqual([
      ['color', 'red', 'size', 'M', 'material', 'Silk'],
    ]);
  });

  it('ignores axes that carry no selected values', () => {
    expect(
      collectApplyPaths([twoAxis[0], { key: 'size', label: 'Size', values: [] }], 'ALL'),
    ).toEqual([
      ['color', 'red'],
      ['color', 'blue'],
    ]);
  });
});

describe('collectApplyAssignments', () => {
  it('pairs every in-scope combo with every filled field name', () => {
    // fix: applyToAll duplicated a 1-axis and a 2-axis loop with six
    // hand-written `if (applyAll.x != null)` blocks. One field-name loop.
    const assignments = collectApplyAssignments(twoAxis, 'color::red', {
      price: '2000',
      stock: '5',
    });
    expect(assignments).toEqual([
      { path: 'sku.variants.color.red.size.S.price', value: '2000' },
      { path: 'sku.variants.color.red.size.S.stock', value: '5' },
      { path: 'sku.variants.color.red.size.M.price', value: '2000' },
      { path: 'sku.variants.color.red.size.M.stock', value: '5' },
    ]);
  });

  it('skips blank cells and empty scope without writing anything', () => {
    expect(collectApplyAssignments(twoAxis, 'ALL', {})).toEqual([]);
    expect(collectApplyAssignments(twoAxis, 'ALL', { price: '2000', specialPrice: '' })).toEqual([
      { path: 'sku.variants.color.red.size.S.price', value: '2000' },
      { path: 'sku.variants.color.red.size.M.price', value: '2000' },
      { path: 'sku.variants.color.blue.size.S.price', value: '2000' },
      { path: 'sku.variants.color.blue.size.M.price', value: '2000' },
    ]);
    expect(collectApplyAssignments([], 'ALL', { price: '2000' })).toEqual([]);
    expect(collectApplyAssignments(twoAxis, 'color::red', { stock: '0' })).toEqual([
      { path: 'sku.variants.color.red.size.S.stock', value: '0' },
      { path: 'sku.variants.color.red.size.M.stock', value: '0' },
    ]);
    expect(collectApplyAssignments(twoAxis, 'color::green', { price: '2000' })).toEqual([]);
  });
});

describe('countBlankSkuCodes', () => {
  it('counts blank and whitespace-only cells across the watched/form split', () => {
    const paths = ['a', 'b', 'c'];
    const values: Record<string, unknown> = { a: 'CLB-A', b: '   ', c: undefined };
    const watched = ['CLB-A', '  ', 'CLB-C'];
    expect(countBlankSkuCodes(paths, (path, index) => watched[index] ?? values[path])).toBe(1);
    expect(countBlankSkuCodes(paths, (path) => values[path])).toBe(2);
    expect(countBlankSkuCodes([], () => '')).toBe(0);
  });
});

describe('fillMissingSkuCodes', () => {
  it('fills only blank cells and never overwrites an existing code', () => {
    const write = vi.fn();
    const existing: Record<string, unknown> = { 'sku.variants.size.S.sellerSku': 'CLB-KEEP' };
    const filled = fillMissingSkuCodes({
      items: [
        { path: 'sku.variants.size.S.sellerSku', options: ['S'] },
        { path: 'sku.variants.size.M.sellerSku', options: ['M'] },
      ],
      read: (path) => existing[path],
      write,
      brand: 'CLB',
      productName: 'Cotton Tee',
      storeCode: 'app',
    });
    expect(filled).toBe(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toBe('sku.variants.size.M.sellerSku');
    expect(String(write.mock.calls[0][1])).toMatch(/^CLB-/);
  });

  it('falls back to the default brand/style tokens when the form values are blank', () => {
    const write = vi.fn();
    fillMissingSkuCodes({
      items: [{ path: 'sku.default.sellerSku', options: [] }],
      read: () => '',
      write,
      brand: '   ',
      productName: '   ',
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(String(write.mock.calls[0][1])).toMatch(/^CLB-/);
  });

  it('reads each cell through its INDEX so a watched read wins over the flat form', () => {
    // The regression: the fill read `form.getValues`, which cannot resolve a
    // cell the matrix holds under a legacy flat dot-key, so every code looked
    // blank. The reader is now the indexed one the button's count uses, and the
    // index is what tells it WHICH cell it is looking at.
    const write = vi.fn();
    const items = [
      { path: 'sku.variants.Color.Red.sellerSku', options: ['Red'] },
      { path: 'sku.variants.Color.Blue.sellerSku', options: ['Blue'] },
    ];
    const seen: Array<[string, number | undefined]> = [];
    const watched = ['CLB-KEEP', ''];

    const filled = fillMissingSkuCodes({
      items,
      read: (path, index) => {
        seen.push([path, index]);
        return watched[index];
      },
      write,
    });

    expect(seen).toEqual([
      ['sku.variants.Color.Red.sellerSku', 0],
      ['sku.variants.Color.Blue.sellerSku', 1],
    ]);
    expect(filled).toBe(1);
    expect(write.mock.calls[0][0]).toBe('sku.variants.Color.Blue.sellerSku');
  });

  it('never writes a readOnly/locked cell and does not count it as filled', () => {
    const write = vi.fn();
    const items = [
      { path: 'sku.variants.Color.Red.sellerSku', options: ['Red'] },
      { path: 'sku.variants.Color.Blue.sellerSku', options: ['Blue'] },
    ];
    const locked = new Set(['sku.variants.Color.Red.sellerSku']);

    const filled = fillMissingSkuCodes({
      items,
      read: () => '',
      write,
      canWrite: (item) => !locked.has(item.path),
    });

    expect(filled).toBe(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toBe('sku.variants.Color.Blue.sellerSku');
  });
});

describe('normalizeVariantMetaItem + toVariantSelection', () => {
  it('normalizes key/label from any of the known axis shapes', () => {
    expect(normalizeVariantMetaItem({ key: 'Color', label: 'Colour' })).toEqual({
      key: 'Color',
      label: 'Colour',
    });
    expect(normalizeVariantMetaItem({ name: 'Size' })).toEqual({ key: 'Size', label: 'Size' });
    expect(normalizeVariantMetaItem({ value: 'Material' })).toEqual({
      key: 'Material',
      label: 'Material',
    });
    expect(normalizeVariantMetaItem(null)).toEqual({ key: '', label: '' });
  });

  it('reads arrays, comma strings, and option objects into axis values', () => {
    const axis = { key: 'Color', label: 'Color' };
    expect(toVariantSelection(axis, ['Red', 'Navy']).values).toEqual(['Red', 'Navy']);
    expect(toVariantSelection(axis, [{ value: 'Red' }, { label: 'Navy' }]).values).toEqual([
      'Red',
      'Navy',
    ]);
    expect(toVariantSelection(axis, 'Red, Navy ,').values).toEqual(['Red', 'Navy']);
    expect(toVariantSelection(axis, 'Red').values).toEqual(['Red']);
    expect(toVariantSelection(axis, undefined).values).toEqual([]);
    expect(toVariantSelection(axis, []).values).toEqual([]);
  });
});

describe('parseVariantAxesResponse', () => {
  it('resolves the canonical envelope and throws on anything else', () => {
    // fix: the queryFn used a 7-level ?? cascade that silently degraded
    // to `[]` (web-admin AGENTS.md §8 bans fallback cascades).
    const axes = [{ key: 'Color', label: 'Color' }];
    expect(parseVariantAxesResponse({ data: { variants: axes } })).toEqual(axes);
    expect(parseVariantAxesResponse({ variants: axes })).toEqual(axes);
    expect(parseVariantAxesResponse({ data: { axes } })).toEqual(axes);
    expect(parseVariantAxesResponse({ axes })).toEqual(axes);
    expect(parseVariantAxesResponse({ data: axes })).toEqual(axes);
    expect(parseVariantAxesResponse(axes)).toEqual(axes);
    expect(() => parseVariantAxesResponse(undefined)).toThrow(/unexpected variant API shape/);
    expect(() => parseVariantAxesResponse('nope')).toThrow(/unexpected variant API shape/);
    expect(() => parseVariantAxesResponse({ data: { unexpected: [] } })).toThrow(
      /unexpected variant API shape/,
    );
    expect(() => parseVariantAxesResponse({ data: { variants: {} } })).toThrow(/expected an array/);
    expect(() => parseVariantAxesResponse({ data: { axes: 'Color' } })).toThrow(
      /expected an array/,
    );
  });
});
