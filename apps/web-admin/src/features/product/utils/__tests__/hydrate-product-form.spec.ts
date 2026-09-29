import { describe, expect, it } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import { flattenObject, getNestedValue, skuVariantPath } from '../add-product-helpers';
import {
  extractColorNames,
  extractSizeNames,
  hydrateProductForm,
  resolveSkuAxes,
  resolveSkuPathPrefix,
  toCategoryPath,
} from '../hydrate-product-form';

/**
 * Every dotted path a fixture is expected to expose, read the way a
 * `useController` cell and the payload both read it: NESTED.
 */
const cell = (hydrated: unknown, path: string): unknown => getNestedValue(hydrated, path);

/** 2D matrix + swatch metadata, the shape that used to emit flat dotted keys. */
const matrixProduct: AdminProductDetail = {
  id: 'prod-456',
  slug: 'denim-jacket',
  name: 'Denim Jacket',
  price: 4000,
  status: 'published',
  categoryId: 'cat-apparel',
  subcategoryId: 'cat-outerwear',
  colorVariants: [
    {
      name: 'Blue',
      colorCode: '#0000FF',
      images: ['https://example.com/blue-jacket.jpg'],
      stocks: [{ size: 'M', quantity: 15 }],
    },
  ],
  skus: [
    {
      skuCode: 'DJ-BLU-M',
      price: 4000,
      discountedPrice: 3500,
      stock: 15,
      isDefault: true,
      selectedOptions: { color: 'Blue', size: 'M' },
    },
  ],
  dynamicData: {
    uploadedAssets: {
      colorMeta: {
        Blue: {
          swatch: 'https://example.com/blue-swatch.png',
          images: ['https://example.com/blue-jacket.jpg'],
          hot: true,
        },
      },
    },
  },
};

describe('hydrateProductForm', () => {
  it('should parse category paths from array, slash string, or name fallback', () => {
    expect(toCategoryPath({ path: ['Fashion', 'Women', 'Dresses'] })).toEqual([
      'Fashion',
      'Women',
      'Dresses',
    ]);
    expect(toCategoryPath({ path: 'Fashion/Women/Dresses' })).toEqual([
      'Fashion',
      'Women',
      'Dresses',
    ]);
    expect(toCategoryPath({ name: 'Accessories' })).toEqual(['Accessories']);
    expect(toCategoryPath(null)).toEqual([]);
  });

  it('should hydrate basic info, prices, main images, and dynamic attributes', () => {
    const product: AdminProductDetail = {
      id: 'prod-123',
      slug: 'silk-evening-dress',
      name: 'Silk Evening Dress',
      brand: 'Gucci',
      description: '100% pure silk dress',
      price: 15000,
      discountedPrice: 12000,
      status: 'draft',
      categoryId: 'cat-root',
      subcategoryId: 'cat-sub',
      mainImages: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      dynamicData: {
        values: {
          Fabric: 'Pure Silk',
          Occasion: 'Party',
        },
      },
    };

    const hydrated = hydrateProductForm(product);
    expect(hydrated.name).toBe('Silk Evening Dress');
    expect(hydrated.brand).toBe('Gucci');
    expect(hydrated.price).toBe(15000);
    expect(hydrated.discountedPrice).toBe(12000);
    expect(hydrated.mainImage).toEqual([
      'https://example.com/img1.jpg',
      'https://example.com/img2.jpg',
    ]);
    expect(hydrated.Fabric).toBe('Pure Silk');
    expect(hydrated.Occasion).toBe('Party');
  });

  it('should hydrate 2D SKU matrix and color swatch metadata', () => {
    const product = matrixProduct;

    const hydrated = hydrateProductForm(product);
    expect(hydrated.Color).toEqual(['Blue']);
    // Nested-only: the swatch/price cells read these by path, and the payload
    // re-flattens them at its own boundary. See the no-dotted-keys invariant
    // below for why the flat spelling is gone for good.
    expect(cell(hydrated, 'variants.colorMeta.Blue.swatch')).toBe(
      'https://example.com/blue-swatch.png',
    );
    expect(cell(hydrated, 'variants.colorMeta.Blue.hot')).toBe(true);
    expect(cell(hydrated, 'sku.variants.Color.Blue.Size.M.price')).toBe('4000');
    expect(cell(hydrated, 'sku.variants.Color.Blue.Size.M.specialPrice')).toBe('3500');
    expect(cell(hydrated, 'sku.variants.Color.Blue.Size.M.stock')).toBe('15');
    // The flat spelling must NOT exist: a flat sibling is invisible to the cell
    // yet used to win every reader that was flat-first.
    expect('sku.variants.Color.Blue.Size.M.price' in hydrated).toBe(false);
  });

  it('hydrates shipping logistics and warranty parameters accurately', () => {
    const product: AdminProductDetail = {
      id: 'prod-789',
      slug: 'leather-boots',
      name: 'Leather Boots',
      price: 8500,
      status: 'draft',
      categoryId: 'cat-shoes',
      packageWeightKg: 1.25,
      packageLengthCm: 35,
      packageWidthCm: 25,
      packageHeightCm: 12,
      packagingType: 'BOX_STANDARD',
      isFragile: true,
      hasBatteryOrLiquid: false,
      warrantyType: 'SELLER_WARRANTY',
      warrantyPeriod: '6 Months Sole Guarantee',
      warrantyPolicy: 'Free replacement if sole separates within 6 months.',
      isNonReturnable: false,
    };

    const hydrated = hydrateProductForm(product);
    expect(hydrated.packageWeightKg).toBe(1.25);
    expect(hydrated.packageLengthCm).toBe(35);
    expect(hydrated.packageWidthCm).toBe(25);
    expect(hydrated.packageHeightCm).toBe(12);
    expect(hydrated.packagingType).toBe('BOX_STANDARD');
    expect(hydrated.isFragile).toBe(true);
    expect(hydrated.warrantyType).toBe('SELLER_WARRANTY');
    expect(hydrated.warrantyPeriod).toBe('6 Months Sole Guarantee');
  });

  it('falls back to safe defaults for legacy products lacking shipping and warranty specifications', () => {
    const legacyProduct: AdminProductDetail = {
      id: 'prod-legacy',
      slug: 'classic-tee',
      name: 'Classic Tee',
      price: 1200,
      status: 'draft',
      categoryId: 'cat-tees',
    };

    const hydrated = hydrateProductForm(legacyProduct);
    // 0.5 kg, the floor every domestic courier accepts. The old 0.3 default sat
    // below it, so a legacy product with no recorded weight was un-quotable.
    expect(hydrated.packageWeightKg).toBe(0.5);
    expect(hydrated.packagingType).toBe('FLYER_SMALL');
    expect(hydrated.isFragile).toBe(false);
    expect(hydrated.warrantyType).toBe('NO_WARRANTY');
  });

  it('hydrates single product without variants into default sku fields', () => {
    const singleProduct: AdminProductDetail = {
      id: 'prod-single',
      name: 'Leather Crossbody Bag',
      price: 4500,
      discountedPrice: 3999,
      status: 'draft',
      categoryId: 'cat-bags',
      skus: [
        {
          skuCode: 'CLB-BAG-001',
          selectedOptions: {},
          price: 4500,
          discountedPrice: 3999,
          stock: 12,
        },
      ],
    };

    const hydrated = hydrateProductForm(singleProduct);
    expect(cell(hydrated, 'sku.default.sellerSku')).toBe('CLB-BAG-001');
    expect(cell(hydrated, 'sku.default.price')).toBe('4500');
    expect(cell(hydrated, 'sku.default.specialPrice')).toBe('3999');
    expect(cell(hydrated, 'sku.default.stock')).toBe('12');
    expect('sku.default.price' in hydrated).toBe(false);
  });

  it('hydrates single-axis size-only variants into size variant paths', () => {
    const sizeOnlyProduct: AdminProductDetail = {
      id: 'prod-size-only',
      name: 'Plain Cotton Tee',
      price: 1500,
      status: 'draft',
      categoryId: 'cat-tees',
      skus: [
        {
          skuCode: 'TEE-S',
          selectedOptions: { Size: 'S' },
          price: 1500,
          stock: 10,
        },
        {
          skuCode: 'TEE-M',
          selectedOptions: { Size: 'M' },
          price: 1500,
          stock: 20,
        },
      ],
    };

    const hydrated = hydrateProductForm(sizeOnlyProduct);
    // The single-axis matrix registers `skuVariantPath('Size', value, …)`, so `Size`
    // (the axis key the row was stored under) is the only readable path — the
    // old writer also emitted axis-less/`size`-lowercase aliases no cell reads.
    expect(cell(hydrated, 'sku.variants.Size.S.sellerSku')).toBe('TEE-S');
    expect(cell(hydrated, 'sku.variants.Size.M.sellerSku')).toBe('TEE-M');
    expect(cell(hydrated, 'sku.variants.S.sellerSku')).toBeUndefined();
  });

  it('hydrates axes the schema named differently, into the cell path verbatim', () => {
    // The colour axis is `Shade` and the size values need sanitising — the two
    // cases where the old hardcoded `Color`/`Size` segments produced a path no
    // cell could read, so edit mode showed those cells permanently blank.
    const shadedProduct: AdminProductDetail = {
      id: 'prod-shaded',
      name: 'Canvas Backpack',
      price: 3200,
      status: 'draft',
      categoryId: 'cat-bags',
      colorVariants: [{ name: 'Navy', colorCode: '#1B3A6B', images: [], stocks: [] }],
      skus: [
        {
          skuCode: 'CB-NAVY-28.5',
          selectedOptions: { Shade: 'Navy', Size: '28.5' },
          price: 3200,
          stock: 7,
        },
      ],
      dynamicData: {
        variantFields: [
          { key: 'Shade', kind: 'color', label: 'Shade' },
          { key: 'Size', kind: 'size', label: 'Size' },
        ],
      },
    };

    const hydrated = hydrateProductForm(shadedProduct);
    // `skuVariantPath` IS `skuVariantPath` (sku-table-utils re-exports it), so this is
    // literally the name the matrix cell registers.
    expect(cell(hydrated, skuVariantPath('Shade', 'Navy', 'Size', '28.5', 'price'))).toBe('3200');
    expect(cell(hydrated, 'sku.variants.Shade.Navy.Size.28_5.stock')).toBe('7');
    expect(cell(hydrated, 'sku.variants.Shade.Navy.Size.28.5.price')).toBeUndefined();
    // The hardcoded `Color` path the old writer produced is gone entirely.
    expect(cell(hydrated, 'sku.variants.Color.Navy.Size.28_5.price')).toBeUndefined();
  });

  it('hydrates every declared axis of an N-axis product, in declaration order', () => {
    // The two-axis case could be satisfied by hardcoding `Color`/`Size`. A third
    // axis is the case that could not: the old prefix builder had two slots, so
    // a 3-axis product's third-axis cell had no writer at all and rendered
    // permanently blank in edit mode.
    const threeAxisProduct: AdminProductDetail = {
      id: 'prod-three-axis',
      name: 'Waxed Field Jacket',
      price: 8800,
      status: 'published',
      categoryId: 'cat-apparel',
      colorVariants: [{ name: 'Olive', colorCode: '#4B5320', images: [], stocks: [] }],
      sizes: [{ name: '40 cm' }],
      skus: [
        {
          skuCode: 'WFJ-OLIVE-40-HERR',
          selectedOptions: { Shade: 'Olive', Length: '40 cm', Weave: 'Herringbone' },
          price: 8800,
          stock: 3,
        },
      ],
      dynamicData: {
        variantFields: [
          { key: 'Shade', kind: 'color', label: 'Shade' },
          { key: 'Length', kind: 'size', label: 'Length' },
          { key: 'Weave', kind: 'other', label: 'Weave' },
        ],
      },
    };

    const hydrated = hydrateProductForm(threeAxisProduct);
    // Exactly the path `collectVariantCombos` + `skuVariantPath` give the cell.
    expect(
      cell(
        hydrated,
        skuVariantPath('Shade', 'Olive', 'Length', '40 cm', 'Weave', 'Herringbone', 'price'),
      ),
    ).toBe('8800');
    expect(
      cell(
        hydrated,
        skuVariantPath('Shade', 'Olive', 'Length', '40 cm', 'Weave', 'Herringbone', 'stock'),
      ),
    ).toBe('3');
    // The two-axis prefix the old builder produced is truncated and unreadable.
    expect(cell(hydrated, 'sku.variants.Shade.Olive.Length.40 cm.price')).toBeUndefined();
  });

  it('emits no dotted key at any depth — the form is nested-only', () => {
    // THE invariant behind the fix: RHF resolves a registered name by nested
    // lookup, so a flat sibling of the same logical field is unreachable for the
    // cell while still being what a flat-first reader resolves. If hydration
    // can no longer emit one, the stale-price path is closed, not narrowed.
    const hydrated = hydrateProductForm(matrixProduct);
    const dotted = collectDottedKeys(hydrated);
    expect(dotted).toEqual([]);
    // ...and the payload boundary still finds every cell, because the ONE
    // flatten runs there and nowhere else.
    const flat = flattenObject(hydrated);
    expect(flat['sku.variants.Color.Blue.Size.M.price']).toBe('4000');
    expect(flat['variants.colorMeta.Blue.swatch']).toBe('https://example.com/blue-swatch.png');
  });

  it('emits no dotted key even for a schema that declares a dotted axis key', () => {
    // The last flat writer in this file: the axis-selection loop used to bracket-
    // write `values[vf.key]`, so a schema naming an axis `Fit.Type` produced a
    // literal dotted key that no cell and no nested reader could resolve.
    const dottedAxisProduct: AdminProductDetail = {
      ...matrixProduct,
      dynamicData: {
        ...matrixProduct.dynamicData,
        variantFields: [
          { key: 'Fit.Type', kind: 'color', label: 'Fit' },
          { key: 'Color', kind: 'size', label: 'Color' },
        ],
      },
    };

    const hydrated = hydrateProductForm(dottedAxisProduct);
    expect(collectDottedKeys(hydrated)).toEqual([]);
    // Written nested, it is readable exactly as the payload reads it back.
    expect(cell(hydrated, 'Fit.Type')).toEqual(['Blue']);
    expect(getNestedValue(hydrated, 'Fit.Type')).toEqual(['Blue']);
  });

  it('leaves getNestedValue with no flat branch to serve on the hydration path', () => {
    // The evidence for keeping `getNestedValue`'s flat-first branch: it is NOT
    // dead. A hand-built record that carries both shapes still resolves flat,
    // which is precisely why the fix had to remove the flat shape from the form
    // rather than rely on the reader preferring the nested one.
    const nestedPath = skuVariantPath('Color', 'Blue', 'Size', 'M', 'price');
    const hydrated = hydrateProductForm(matrixProduct);
    expect(cell({ ...hydrated, [nestedPath]: '9999' }, nestedPath)).toBe('9999');

    // What closes the hazard is the producer side: hydration can no longer
    // manufacture the flat sibling at all, so the branch is unreachable from
    // anything that flows through this file — the form holds one shape only.
    expect(nestedPath in hydrated).toBe(false);
    expect(cell(hydrated, nestedPath)).toBe('4000');
    expect(collectDottedKeys(hydrated)).toEqual([]);
  });
});

/** Every dotted key at every depth, so a nested flat key is caught too. */
function collectDottedKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [...(key.includes('.') ? [path] : []), ...collectDottedKeys(entry, path)];
  });
}

describe('resolveSkuPathPrefix', () => {
  it('is skuVariantPath itself, so the writer and the cell path cannot drift', () => {
    // `skuVariantPath` is what `sku-table-utils` re-exports as the cells'
    // `skuVariantPath`; asserting identity-by-construction is the whole point.
    expect(
      resolveSkuPathPrefix([
        ['Color', 'Red'],
        ['Size', 'M'],
      ]),
    ).toBe(skuVariantPath('Color', 'Red', 'Size', 'M'));
    expect(
      resolveSkuPathPrefix([
        ['Color', 'Red'],
        ['Size', 'M'],
      ]),
    ).toBe('sku.variants.Color.Red.Size.M');
  });

  it('sanitises keys and values exactly as the cell side does', () => {
    expect(resolveSkuPathPrefix([['Size', '28.5']])).toBe('sku.variants.Size.28_5');
    expect(resolveSkuPathPrefix([['Color', '6 [slim]']])).toBe('sku.variants.Color.6 (slim)');
    // A schema may itself name an axis with a dot; the segment is encoded, not
    // split into two — otherwise the cell's `skuVariantPath` name differs.
    expect(resolveSkuPathPrefix([['Shade.Tone', 'Deep']])).toBe('sku.variants.Shade_Tone.Deep');
  });

  it("uses the product's own axis keys, never the Color/Size literals", () => {
    expect(
      resolveSkuPathPrefix([
        ['Shade', 'Navy'],
        ['Length', '40 cm'],
      ]),
    ).toBe(skuVariantPath('Shade', 'Navy', 'Length', '40 cm'));
    expect(
      resolveSkuPathPrefix([
        ['Shade', 'Navy'],
        ['Length', '40 cm'],
      ]),
    ).toBe('sku.variants.Shade.Navy.Length.40 cm');
  });

  it('generalises to N axes and drops only what the row leaves unselected', () => {
    // A third axis is walked in declaration order — the same order the cells
    // walk their axes in, so a 3-axis product cannot orphan a cell the way a
    // hardcoded two-segment prefix did.
    expect(
      resolveSkuPathPrefix([
        ['Shade', 'Navy'],
        ['Length', '40 cm'],
        ['Weave', 'Herringbone'],
      ]),
    ).toBe('sku.variants.Shade.Navy.Length.40 cm.Weave.Herringbone');
    // A row that selects no variant at all is the product's `sku.default` row:
    // the caller must fall back rather than invent a path.
    expect(resolveSkuPathPrefix([])).toBeUndefined();
  });
});

/**
 * A TYPE-VALID `AdminProductDetail` carrying only the `dynamicData` an axis
 * lookup reads. Built as a real fixture rather than cast to the domain type, so
 * the fixture cannot drift from `AdminProductDetail`'s required fields.
 */
const axisFixture = (dynamicData: Record<string, unknown>): AdminProductDetail => ({
  id: 'prod-axes',
  name: 'Axis Fixture',
  price: 1000,
  status: 'draft',
  dynamicData,
});

describe('resolveSkuAxes', () => {
  it('reads the real axis keys, in declaration order, out of persisted variantFields', () => {
    expect(
      resolveSkuAxes(
        axisFixture({
          variantFields: [
            { key: 'Shade', kind: 'color' },
            { key: 'Length', kind: 'size' },
          ],
        }),
      ),
    ).toEqual({ keys: ['Shade', 'Length'], color: 'Shade', size: 'Length' });
  });

  it('keeps every declared axis, so a third axis is not silently dropped', () => {
    const axes = resolveSkuAxes(
      axisFixture({
        variantFields: [
          { key: 'Shade', kind: 'color' },
          { key: 'Length', kind: 'size' },
          { key: 'Weave', kind: 'other' },
        ],
      }),
    );
    expect(axes.keys).toEqual(['Shade', 'Length', 'Weave']);
    // `kind` still decides the two legacy-column slots, independent of position.
    expect(axes.color).toBe('Shade');
    expect(axes.size).toBe('Length');
  });

  it('falls back to the keys the payload writes when a product carries no axes', () => {
    expect(resolveSkuAxes(axisFixture({}))).toEqual({
      keys: ['Color', 'Size'],
      color: 'Color',
      size: 'Size',
    });
    // A malformed stored record must fall back too, not read `.key` off a string.
    expect(resolveSkuAxes(axisFixture({ variantFields: 'nope' }))).toEqual({
      keys: ['Color', 'Size'],
      color: 'Color',
      size: 'Size',
    });
    // Junk entries are dropped, not read as a blank segment.
    expect(
      resolveSkuAxes(axisFixture({ variantFields: [{ key: '  ' }, null, { key: 'Shade' }] })).keys,
    ).toEqual(['Shade']);
  });
});

describe('extractColorNames and extractSizeNames', () => {
  it('extracts color names cleanly and filters out empty items', () => {
    expect(
      extractColorNames([{ name: 'Red' }, { colorName: 'Blue' }, null, {}, { name: 'Green' }]),
    ).toEqual(['Red', 'Blue', 'Green']);
    expect(extractColorNames(null)).toEqual([]);
  });

  it('extracts size names from string or object formats', () => {
    expect(extractSizeNames(['S', { name: 'M' }, null, { name: '' }, 'L'])).toEqual([
      'S',
      'M',
      'L',
    ]);
    expect(extractSizeNames(undefined)).toEqual([]);
  });
});
