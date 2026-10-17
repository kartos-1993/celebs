import { describe, expect, it, vi } from 'vitest';

import { APPLY_ALL_FIELD_NAMES } from '../../fields/components/sku-table-utils';
import type { FieldSpec } from '../../types';
import {
  defaultSkuPath,
  getFirstPrice,
  getNestedValue,
  normalizeText,
  sanitizeVariantKey,
} from '../add-product-helpers';
import {
  buildCanonicalColorMeta,
  buildPayloadColorVariants,
  buildPayloadDynamicValues,
  buildPayloadSizes,
  buildPayloadSkus,
  buildPayloadVariantOptions,
  buildProductPayload,
  pruneOrphanVariantPaths,
  resolveVariantStockList,
} from '../add-product-payload';
import { collectPricingErrors } from '../add-product-validation';

const baseFields: FieldSpec[] = [
  { name: 'name', uiType: 'input', label: 'Product Name', group: 'base', required: true },
  { name: 'Color', uiType: 'multiselect', label: 'Available Colors', group: 'variant' },
  { name: 'Size', uiType: 'multiselect', label: 'Available Sizes', group: 'variant' },
];

const mockUpload = vi.fn().mockImplementation(async (files: unknown[]) => {
  return (files as unknown[]).map((f, i) =>
    typeof f === 'string' ? f : `https://cdn.example.com/uploaded-${i}.jpg`,
  );
});

describe('payload helpers', () => {
  it('normalizeText trims strings and stringifies non-null values', () => {
    expect(normalizeText('  hi  ')).toBe('hi');
    expect(normalizeText('')).toBe('');
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(123)).toBe('123');
    expect(normalizeText('  a  b  ')).toBe('a  b');
  });

  it('sanitizeVariantKey encodes dots/brackets for RHF dot-paths', () => {
    expect(sanitizeVariantKey('Red')).toBe('Red');
    expect(sanitizeVariantKey('28.5')).toBe('28_5');
    expect(sanitizeVariantKey('6 [slim]')).toBe('6 (slim)');
    expect(sanitizeVariantKey('  a  b ')).toBe('a b');
  });

  it('helpers getNestedValue prefers flat dot-keys then deep traversal', () => {
    expect(getNestedValue({ 'a.b': 1, a: { b: 2 } }, 'a.b')).toBe(1);
    expect(getNestedValue({ a: { b: 2 } }, 'a.b')).toBe(2);
    expect(getNestedValue({ a: { b: 2 } }, 'a.missing')).toBeUndefined();
    expect(getNestedValue(null, 'a.b')).toBeUndefined();
  });

  it('getFirstPrice prefers root price, then sku.default, then first-inserted variant', () => {
    expect(getFirstPrice({ price: '100' }, '.price')).toBe(100);
    expect(getFirstPrice({ 'sku.default.price': '200' }, '.price')).toBe(200);
    // fix: insertion (selection) order wins over alphabetical order —
    // Zebra was inserted first so it wins over alphabetically-first Apple.
    expect(
      getFirstPrice(
        { 'sku.variants.Zebra.price': '999', 'sku.variants.Apple.price': '111' },
        '.price',
      ),
    ).toBe(999);
    // Explicit priority holds regardless of insertion order.
    expect(
      getFirstPrice(
        { 'sku.variants.Apple.price': '111', 'sku.default.price': '200', price: '100' },
        '.price',
      ),
    ).toBe(100);
    expect(
      getFirstPrice({ 'sku.variants.Apple.price': '111', 'sku.default.price': '200' }, '.price'),
    ).toBe(200);
  });

  it('getFirstPrice never sorts the remaining flat price keys', () => {
    // fix: both candidate lists were `.sort()`ed, so the
    // alphabetically-first cell won over the first-inserted one.
    expect(getFirstPrice({ 'zzz.price': '500', 'aaa.price': '600' }, '.price')).toBe(500);
    expect(
      getFirstPrice({ 'zzz.specialPrice': '50', 'aaa.specialPrice': '60' }, '.specialPrice'),
    ).toBe(50);
    // Blank first-inserted cells are skipped, never sorted around.
    expect(
      getFirstPrice(
        { 'sku.variants.Zebra.price': '', 'sku.variants.Apple.price': '111' },
        '.price',
      ),
    ).toBe(111);
  });
});

describe('pruneOrphanVariantPaths', () => {
  it('keeps non-variant keys and drops deselected single-axis leaves', () => {
    const flat = {
      'sku.default.stock': '5',
      'sku.variants.Color.Red.price': '10',
      'sku.variants.Color.Blue.price': '20',
    };
    const out = pruneOrphanVariantPaths(flat, [{ key: 'Color', values: ['Red'] }]);
    expect(out['sku.default.stock']).toBe('5');
    expect(out['sku.variants.Color.Red.price']).toBe('10');
    expect(out['sku.variants.Color.Blue.price']).toBeUndefined();
  });

  it('keeps only selected 2-axis combos', () => {
    const flat = {
      'sku.variants.Color.Red.Size.S.price': '10',
      'sku.variants.Color.Red.Size.M.price': '20',
    };
    const out = pruneOrphanVariantPaths(flat, [
      { key: 'Color', values: ['Red'] },
      { key: 'Size', values: ['S'] },
    ]);
    expect(out['sku.variants.Color.Red.Size.S.price']).toBe('10');
    expect(out['sku.variants.Color.Red.Size.M.price']).toBeUndefined();
  });

  it('drops stale variant paths when no live axes exist but keeps other keys', () => {
    const flat = {
      'sku.default.stock': '5',
      'sku.variants.Color.Red.price': '10',
    };
    // fix: the early return leaked stale sku.variants.* paths — the
    // docstring contract (strip variants, keep non-variant keys) now holds.
    const out = pruneOrphanVariantPaths(flat, []);
    expect(out).not.toBe(flat);
    expect(out['sku.default.stock']).toBe('5');
    expect(out['sku.variants.Color.Red.price']).toBeUndefined();
    const out2 = pruneOrphanVariantPaths(flat, [{ key: '', values: ['x'] }]);
    expect(out2['sku.default.stock']).toBe('5');
    expect(out2['sku.variants.Color.Red.price']).toBeUndefined();
  });

  it('prunes deselected values on every axis (N-axis cartesian, no silent leak)', () => {
    const flat = {
      'sku.variants.Color.Red.Size.M.Material.Cotton.price': '10',
      'sku.variants.Color.Red.Size.M.Material.Silk.price': '20',
    };
    const out = pruneOrphanVariantPaths(flat, [
      { key: 'Color', values: ['Red'] },
      { key: 'Size', values: ['M'] },
      { key: 'Material', values: ['Cotton'] },
    ]);
    // fix: only the first two axes used to constrain pruning, so the
    // deselected third-axis value (Silk) leaked through.
    expect(out['sku.variants.Color.Red.Size.M.Material.Cotton.price']).toBe('10');
    expect(out['sku.variants.Color.Red.Size.M.Material.Silk.price']).toBeUndefined();
  });
});

describe('buildPayload* units', () => {
  it('buildPayloadSizes maps labels and drops empty measurements', () => {
    const out = buildPayloadSizes(['S'], new Map([['S', 'Small']]), [
      {
        name: 'Small',
        productMeasurements: [
          { name: 'Chest', value: '10', unit: 'cm' },
          { name: 'Empty', value: '  ', unit: 'cm' },
        ],
        bodyMeasurements: [],
      },
    ]);
    expect(out).toEqual([
      {
        name: 'Small',
        productMeasurements: [{ name: 'Chest', value: '10', unit: 'cm' }],
        bodyMeasurements: [],
      },
    ]);
    expect(buildPayloadSizes([], new Map(), undefined)).toEqual([]);
  });

  it('resolveVariantStockList reads cells per shape with defaultStock fallback', () => {
    const sizeLabelMap = new Map([['S', 'S']]);
    expect(
      resolveVariantStockList({
        colorValue: 'Red',
        selectedColors: ['Red'],
        colorFieldName: 'Color',
        selectedSizes: ['S'],
        sizeFieldName: 'Size',
        sizeLabelMap,
        skuFlatValues: { 'sku.variants.Color.Red.Size.S.stock': '15' },
        defaultStock: 7,
      }),
    ).toEqual([{ size: 'S', quantity: 15 }]);
    expect(
      resolveVariantStockList({
        colorValue: 'Red',
        selectedColors: ['Red'],
        colorFieldName: 'Color',
        selectedSizes: [],
        sizeFieldName: undefined,
        sizeLabelMap,
        skuFlatValues: {},
        defaultStock: 7,
      }),
    ).toEqual([{ size: 'default', quantity: 7 }]);
    expect(
      resolveVariantStockList({
        colorValue: '',
        selectedColors: [],
        colorFieldName: undefined,
        selectedSizes: [],
        sizeFieldName: undefined,
        sizeLabelMap,
        skuFlatValues: {},
        defaultStock: 3,
      }),
    ).toEqual([{ size: 'default', quantity: 3 }]);
  });

  it('buildPayloadColorVariants labels placeholder as Default with main images', () => {
    const out = buildPayloadColorVariants({
      effectiveColors: ['default'],
      selectedColors: [],
      colorFieldName: undefined,
      selectedSizes: [],
      sizeFieldName: undefined,
      colorLabelMap: new Map(),
      sizeLabelMap: new Map(),
      skuFlatValues: {},
      defaultStock: 4,
      uploadedColorAssets: {},
      effectiveMainImages: ['https://example.com/cover.jpg'],
      isUpdate: false,
      mainImages: ['https://example.com/cover.jpg'],
    });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Default');
    expect(out[0].colorCode).toBe('#000000');
    expect(out[0].images).toEqual(['https://example.com/cover.jpg']);
    expect(out[0].stocks).toEqual([{ size: 'default', quantity: 4 }]);
  });

  it('buildPayloadVariantOptions emits Color then Size options', () => {
    expect(
      buildPayloadVariantOptions(
        'Color',
        ['Red'],
        new Map([['Red', 'Red']]),
        'Size',
        ['S'],
        new Map([['S', 'S']]),
      ),
    ).toEqual([
      { name: 'Color', values: ['Red'] },
      { name: 'Size', values: ['S'] },
    ]);
    expect(buildPayloadVariantOptions()).toEqual([]);
  });

  it('buildPayloadSkus defaults empty variant stock to 0 (no sku.default leak)', () => {
    const skus = buildPayloadSkus({
      colorFieldName: 'Color',
      sizeFieldName: undefined,
      selectedColors: ['Red'],
      selectedSizes: [],
      colorLabelMap: new Map([['Red', 'Red']]),
      sizeLabelMap: new Map(),
      uploadedColorAssets: {},
      mainImages: [],
      effectiveMainImages: [],
      skuFlatValues: {},
      flatValues: { 'sku.default.stock': '9' },
      price: 2000,
      brand: 'B',
      productName: 'P',
    });
    // fix: an empty variant cell used to inherit sku.default.stock —
    // explicit per-variant stock is required, so the cell falls back to 0.
    // The sku.default.* branch (no variants selected) still reads its own cell.
    expect(skus).toHaveLength(1);
    expect(skus[0].stock).toBe(0);
    expect(skus[0].isDefault).toBe(true);
  });

  it('buildPayloadSkus keeps explicit variant stock and default-branch stock', () => {
    const base = {
      sizeFieldName: undefined,
      selectedSizes: [],
      colorLabelMap: new Map([['Red', 'Red']]),
      sizeLabelMap: new Map(),
      uploadedColorAssets: {},
      mainImages: [],
      effectiveMainImages: [],
      brand: 'B',
      productName: 'P',
    };
    const variant = buildPayloadSkus({
      ...base,
      colorFieldName: 'Color',
      selectedColors: ['Red'],
      skuFlatValues: { 'sku.variants.Color.Red.stock': '15' },
      flatValues: { 'sku.default.stock': '9' },
      price: 2000,
    });
    expect(variant[0].stock).toBe(15);
    const fallback = buildPayloadSkus({
      ...base,
      colorFieldName: undefined,
      selectedColors: [],
      skuFlatValues: {},
      flatValues: { 'sku.default.stock': '9' },
      price: 2000,
    });
    expect(fallback[0].stock).toBe(9);
  });

  it('buildPayloadSkus never synthesizes price from a specialPrice cell', () => {
    const skus = buildPayloadSkus({
      colorFieldName: 'Color',
      sizeFieldName: undefined,
      selectedColors: ['Red'],
      selectedSizes: [],
      colorLabelMap: new Map([['Red', 'Red']]),
      sizeLabelMap: new Map(),
      uploadedColorAssets: {},
      mainImages: [],
      effectiveMainImages: [],
      skuFlatValues: { 'sku.variants.Color.Red.specialPrice': '500' },
      flatValues: {},
      price: 2000,
      brand: 'B',
      productName: 'P',
    });
    // fix: a filled discount with a blank price used to silently become
    // the price (500, no discount). Now the top-level price applies and the
    // discount is preserved; validation flags the blank price cell instead.
    expect(skus[0].price).toBe(2000);
    expect(skus[0].discountedPrice).toBe(500);
  });

  it('validation errors on blank price with a filled discount (no silent synthesis)', () => {
    const errors = collectPricingErrors({
      fields: baseFields,
      values: {
        Color: ['Red'],
        'sku.variants.Color.Red.price': '',
        'sku.variants.Color.Red.specialPrice': '500',
        'sku.variants.Color.Red.stock': '5',
        'sku.variants.Color.Red.sellerSku': 'CLB-RED-001',
      },
      variantMeta: [{ key: 'Color', label: 'Color' }],
    });
    expect(errors.some((message) => message.includes('add a valid price'))).toBe(true);
  });

  it('collects a per-variant stock error when only sku.default.stock is filled', () => {
    // fix: the empty variant cell used to inherit sku.default.stock, so
    // the row silently shipped the default quantity. Explicit per-variant
    // stock is required; the missing cell is a collectable error.
    const errors = collectPricingErrors({
      fields: baseFields,
      values: {
        Color: ['Red'],
        'sku.default.stock': '42',
        'sku.variants.Color.Red.price': '1000',
        'sku.variants.Color.Red.sellerSku': 'CLB-RED-001',
      },
      variantMeta: [{ key: 'Color', label: 'Color' }],
    });
    expect(errors).toContain('Color: Red: stock quantity is required.');
  });

  it('collects every non-sellerSku variant cell so collectSellerSkuItems stays sku-only', () => {
    // fix (#10): the justification for the sellerSku-only helper scope —
    // price and discount are each validated per row here, and buildPayloadSkus
    // reads them from the same paths, so the helper only has to own sellerSku.
    const errors = collectPricingErrors({
      fields: baseFields,
      values: {
        Color: ['Red'],
      },
      variantMeta: [{ key: 'Color', label: 'Color' }],
    });
    expect(errors).toContain('Color: Red: add a valid price.');
    expect(errors).toContain('Color: Red: stock quantity is required.');
    expect(errors).toContain('Color: Red: SKU code is required.');
  });

  it('reports no freeItems error — the phantom cell no longer exists in the form', () => {
    // `freeItems` has no schema key and no Prisma column, so the payload always
    // dropped it. The input, the batch-apply scope and this rule were all
    // removed together: a seller can no longer type a value that is discarded.
    const errors = collectPricingErrors({
      fields: baseFields,
      values: {
        Color: ['Red'],
        'sku.variants.Color.Red.price': '1000',
        'sku.variants.Color.Red.stock': '5',
        'sku.variants.Color.Red.sellerSku': 'CLB-RED-001',
        'sku.variants.Color.Red.freeItems': '2',
      },
      variantMeta: [{ key: 'Color', label: 'Color' }],
    });
    expect(errors).toEqual([]);
  });

  it('buildPayloadSkus sets discountedPrice only when below price', () => {
    const base = {
      colorFieldName: 'Color',
      sizeFieldName: undefined,
      selectedColors: ['Red'],
      selectedSizes: [],
      colorLabelMap: new Map([['Red', 'Red']]),
      sizeLabelMap: new Map(),
      uploadedColorAssets: {},
      mainImages: [],
      effectiveMainImages: [],
      flatValues: {},
      brand: 'B',
      productName: 'P',
    };
    const withDiscount = buildPayloadSkus({
      ...base,
      skuFlatValues: {
        'sku.variants.Color.Red.price': '2000',
        'sku.variants.Color.Red.specialPrice': '1500',
      },
      price: 2000,
    });
    expect(withDiscount[0].discountedPrice).toBe(1500);
    const withoutDiscount = buildPayloadSkus({
      ...base,
      skuFlatValues: {
        'sku.variants.Color.Red.price': '2000',
        'sku.variants.Color.Red.specialPrice': '2500',
      },
      price: 2000,
    });
    expect(withoutDiscount[0].discountedPrice).toBeUndefined();
  });

  it('buildPayloadDynamicValues namespaces dotted field names instead of dropping them', () => {
    const fields = [
      { name: 'material', uiType: 'input', label: 'Material', group: 'details' },
      { name: 'custom.text', uiType: 'input', label: 'Custom', group: 'details' },
      { name: 'price', uiType: 'number', label: 'Price', group: 'sale' },
    ] as FieldSpec[];
    // fix: dotted names were skipped outright. They are now nested so
    // the keys carry no dots (no RHF dot-path collision); structural sku.* /
    // variants.* / sizes paths stay excluded (persisted elsewhere).
    expect(buildPayloadDynamicValues(fields, { material: 'Cotton', 'custom.text': 'x' })).toEqual({
      material: 'Cotton',
      custom: { text: 'x' },
    });
    expect(
      buildPayloadDynamicValues(fields, { material: 'Cotton', custom: { text: 'y' } }),
    ).toEqual({ material: 'Cotton', custom: { text: 'y' } });
    expect(
      buildPayloadDynamicValues(
        [
          ...fields,
          { name: 'sku.foo', uiType: 'input', label: 'S', group: 'details' },
        ] as FieldSpec[],
        { material: 'Cotton', 'sku.foo': 'leak' },
      ),
    ).toEqual({ material: 'Cotton' });
  });

  it('buildPayloadDynamicValues records axis selections under a dot-free namespace', () => {
    // fix: axis selections were dropped outright, so the stored product
    // never carried which variant axes were chosen. They now land under a
    // reserved, dot-free key that cannot be read back as an RHF path.
    const fields = [
      { name: 'Color', uiType: 'multiselect', label: 'Color', group: 'variant' },
      { name: 'Size', uiType: 'multiselect', label: 'Size', group: 'variant' },
      { name: 'fit.custom.length', uiType: 'input', label: 'Length', group: 'details' },
    ] as FieldSpec[];
    const out = buildPayloadDynamicValues(
      fields,
      { Color: ['Red', 'Navy'], Size: ['S'], 'fit.custom.length': '30' },
      'Color',
      'Size',
    );
    expect(out).toEqual({
      variantAxes: { Color: ['Red', 'Navy'], Size: ['S'] },
      fit: { custom: { length: '30' } },
    });
    expect(Object.keys(out).some((key) => key.includes('.'))).toBe(false);
    // An axis with nothing selected is omitted rather than stored as [].
    expect(
      buildPayloadDynamicValues(fields, { Color: [], 'fit.custom.length': '30' }, 'Color', 'Size'),
    ).toEqual({ fit: { custom: { length: '30' } } });
  });

  it('keeps dotted custom fields and axis metadata in dynamicData.values', async () => {
    // fix: proof at the payload level that the namespacing survives
    // buildProductPayload and cannot collide with an RHF dot-path.
    const payload = await buildProductPayload({
      fields: [
        ...baseFields,
        { name: 'fit.custom.length', uiType: 'input', label: 'Length', group: 'details' },
      ],
      status: 'draft',
      values: {
        name: 'Tee',
        brand: 'B',
        categoryId: 'c1',
        subcategoryId: 's1',
        Color: ['Red'],
        'fit.custom.length': '30',
        'sku.default.price': '1000',
        'sku.default.stock': '5',
        mainImage: ['https://example.com/cover.jpg'],
      },
      upload: mockUpload,
    });
    const values = payload.dynamicData?.values as Record<string, unknown>;
    expect(values.fit).toEqual({ custom: { length: '30' } });
    expect(values.variantAxes).toEqual({ Color: ['Red'] });
    expect(Object.keys(values)).toEqual(expect.arrayContaining(['fit', 'variantAxes']));
    expect(Object.keys(values).filter((key) => key.includes('.'))).toEqual([]);
  });

  it('buildCanonicalColorMeta passes swatch/images/hot through', () => {
    expect(buildCanonicalColorMeta({ Red: { hot: true, images: ['a'], swatch: 's' } })).toEqual({
      Red: { hot: true, images: ['a'], swatch: 's' },
    });
    expect(buildCanonicalColorMeta({})).toEqual({});
  });
});

describe('defaultSkuPath identity', () => {
  it('returns the identical sku.default.* strings it replaced', () => {
    expect(defaultSkuPath('price')).toBe('sku.default.price');
    expect(defaultSkuPath('specialPrice')).toBe('sku.default.specialPrice');
    expect(defaultSkuPath('stock')).toBe('sku.default.stock');
    expect(defaultSkuPath('sellerSku')).toBe('sku.default.sellerSku');
    expect(defaultSkuPath('available')).toBe('sku.default.available');
  });
});

describe('buildProductPayload tags/featured', () => {
  it('sends schema defaults on create (no tags/featured inputs exist in the form)', async () => {
    const payload = await buildProductPayload({
      fields: baseFields,
      status: 'draft',
      values: {
        name: 'Tee',
        brand: 'B',
        categoryId: 'c1',
        subcategoryId: 's1',
        price: 1000,
        tags: ['sale'],
        featured: true,
        'sku.default.price': '1000',
        'sku.default.stock': '5',
        mainImage: ['https://example.com/cover.jpg'],
      },
      upload: mockUpload,
    });
    // fix (evidence: no tags/featured inputs exist anywhere under
    // features/product): create carries provided values falling back to the
    // schema defaults ([] / false).
    expect(payload.tags).toEqual(['sale']);
    expect(payload.featured).toBe(true);
  });

  it('omits tags/featured keys on update so stored values persist', async () => {
    const payload = await buildProductPayload({
      fields: baseFields,
      status: 'draft',
      values: {
        name: 'Tee',
        brand: 'B',
        categoryId: 'c1',
        subcategoryId: 's1',
        price: 1000,
        tags: ['sale'],
        featured: true,
        'sku.default.price': '1000',
        'sku.default.stock': '5',
        mainImage: ['https://example.com/cover.jpg'],
      },
      upload: mockUpload,
      isUpdate: true,
    });
    // The API only overwrites tags/featured when the keys are present
    // (buildProductUpdateData guards on !== undefined), so omitting them
    // keeps previously stored values instead of resetting to [] / false.
    expect(payload).not.toHaveProperty('tags');
    expect(payload).not.toHaveProperty('featured');
  });
});

describe('buildProductPayload skus', () => {
  it('ignores freeItems/available cells (skuItemSchema carries no such keys)', async () => {
    const payload = await buildProductPayload({
      fields: baseFields,
      status: 'draft',
      values: {
        name: 'Tee',
        brand: 'B',
        categoryId: 'c1',
        subcategoryId: 's1',
        Color: ['Red'],
        'sku.default.price': '1000',
        'sku.default.stock': '5',
        'sku.variants.Color.Red.price': '1000',
        'sku.variants.Color.Red.stock': '5',
        'sku.variants.Color.Red.freeItems': '2',
        'sku.variants.Color.Red.available': true,
        mainImage: ['https://example.com/cover.jpg'],
      },
      upload: mockUpload,
    });
    // the fix decision (fix #8): skuItemSchema has no freeItems/available
    // keys, so persisting them would be stripped server-side. `available` is
    // still a display-only checkbox, but `freeItems` is gone from every layer
    // that touched it — the input, the batch-apply scope and the per-row
    // validation rule — so nothing collects a value any more.
    expect(payload.skus).toHaveLength(1);
    expect(payload.skus?.[0]).not.toHaveProperty('freeItems');
    expect(payload.skus?.[0]).not.toHaveProperty('available');
    expect(APPLY_ALL_FIELD_NAMES).not.toContain('freeItems');
    expect(APPLY_ALL_FIELD_NAMES).not.toContain('available');
  });

  it('builds a 2-sku color matrix with first sku default', async () => {
    const payload = await buildProductPayload({
      fields: baseFields,
      status: 'draft',
      values: {
        name: 'Shirt',
        brand: 'B',
        categoryId: 'c1',
        subcategoryId: 's1',
        Color: ['Red', 'Navy'],
        'sku.default.price': '2000',
        'sku.default.stock': '10',
        'sku.variants.Color.Red.price': '2000',
        'sku.variants.Color.Red.stock': '15',
        'sku.variants.Color.Navy.price': '2200',
        'sku.variants.Color.Navy.stock': '8',
        mainImage: ['https://example.com/cover.jpg'],
      },
      upload: mockUpload,
    });
    expect(payload.skus).toHaveLength(2);
    expect(payload.skus?.[0].isDefault).toBe(true);
    expect(payload.skus?.[1].isDefault).toBe(false);
    expect(payload.skus?.[0].price).toBe(2000);
    expect(payload.skus?.[1].price).toBe(2200);
  });

  it('throws a field-mapped error on duplicate skuCode/sellerSku within builtSkus', () => {
    const base = {
      colorFieldName: 'Color',
      sizeFieldName: undefined,
      selectedColors: ['Red', 'Navy'],
      selectedSizes: [],
      colorLabelMap: new Map([
        ['Red', 'Red'],
        ['Navy', 'Navy'],
      ]),
      sizeLabelMap: new Map(),
      uploadedColorAssets: {},
      mainImages: [],
      effectiveMainImages: [],
      flatValues: {},
      price: 2000,
      brand: 'B',
      productName: 'P',
    };
    // fix (#14): client-side pre-empt of the server 409 — the message
    // names the duplicate code and the sellerSku form paths to fix.
    expect(() =>
      buildPayloadSkus({
        ...base,
        skuFlatValues: {
          'sku.variants.Color.Red.price': '2000',
          'sku.variants.Color.Red.stock': '5',
          'sku.variants.Color.Red.sellerSku': 'CLB-DUP-001',
          'sku.variants.Color.Navy.price': '2000',
          'sku.variants.Color.Navy.stock': '5',
          'sku.variants.Color.Navy.sellerSku': 'CLB-DUP-001',
        },
      }),
    ).toThrow(/Duplicate SKU code "CLB-DUP-001".*sellerSku/s);
  });

  it('sanitizeVariantKey preserves case so live RHF paths keep matching', () => {
    // the fix decision (fix #9): buildVariantKey (shared-utils) lowercases and
    // sorts for canonical backend matching, but sanitizeVariantKey must NOT —
    // stored/reader paths such as sku.variants.Color.Red are case-sensitive.
    expect(sanitizeVariantKey('NAVY')).toBe('NAVY');
    expect(sanitizeVariantKey('Red')).toBe('Red');
    expect(sanitizeVariantKey('Light Blue')).toBe('Light Blue');
  });

  it('reads back the exact case that skuVariantPath and the stored form values use', () => {
    // fix: the round-trip proof for the case decision — the payload
    // writer, the payload reader, and the validator must all agree with the
    // case the hydrated/stored form paths already use.
    const storedPath = 'sku.variants.Color.Light Blue.Size.28_5';
    const skus = buildPayloadSkus({
      colorFieldName: 'Color',
      sizeFieldName: 'Size',
      selectedColors: ['Light Blue'],
      selectedSizes: ['28.5'],
      colorLabelMap: new Map([['Light Blue', 'Light Blue']]),
      sizeLabelMap: new Map([['28.5', '28.5']]),
      uploadedColorAssets: {},
      mainImages: [],
      effectiveMainImages: [],
      skuFlatValues: {
        [`${storedPath}.price`]: '2000',
        [`${storedPath}.stock`]: '7',
        [`${storedPath}.sellerSku`]: 'CLB-LB-28_5',
      },
      flatValues: { 'sku.default.price': '9999', 'sku.default.stock': '99' },
      price: 2000,
      brand: 'B',
      productName: 'P',
    });
    expect(skus[0].skuCode).toBe('CLB-LB-28_5');
    expect(skus[0].price).toBe(2000);
    expect(skus[0].stock).toBe(7);
    expect(
      pruneOrphanVariantPaths({ [`${storedPath}.price`]: '2000' }, [
        { key: 'Color', values: ['Light Blue'] },
        { key: 'Size', values: ['28.5'] },
      ])[`${storedPath}.price`],
    ).toBe('2000');
  });
});
