import { describe, expect, it } from 'vitest';

import {
  buildSeedProductPayload,
  readProductDataset,
  type SeedProductItem,
  type SeedProductRefs,
} from '../seed-products';

const REFS: SeedProductRefs = {
  brandId: 'brand-denim',
  brandName: 'Celebs Denim',
  categoryId: 'cat-parent',
  subcategoryId: 'cat-child',
};

const ITEM: SeedProductItem = {
  name: 'Manfinity Test Denim Jacket',
  categorySlug: 'men-denim-jackets',
  brandSlug: 'celebs-denim',
  vendorShopName: 'Celebs Official',
  description: 'Engineered heavy-retention denim jacket. Denim. Streetwear.',
  price: 2800,
  discountedPrice: 2380,
  featured: true,
  tags: ['denim', 'jacket'],
  skuPrefix: 'CEL-JKT',
  stockPerSize: 25,
  attributes: { 'Fit Type': 'Regular Fit', 'Body / Lining': 'Fleece Lined' },
  sizeChart: [
    { Size: 'S', Shoulder: 48, Bust: 110, Length: 66, 'Sleeve Length': 63 },
    { Size: 'M', Shoulder: 50, Bust: 115, Length: 68, 'Sleeve Length': 64 },
  ],
  variants: [
    { color: 'Blue', colorCode: '#1E90FF', images: ['https://img.test/blue-1.jpg'] },
    { color: 'Black', colorCode: '#1A1A1A', images: ['https://img.test/black-1.jpg'] },
  ],
};

describe('buildSeedProductPayload', () => {
  it('maps size rows to sizes with cm product measurements in row order', () => {
    const payload = buildSeedProductPayload(ITEM, 0, REFS);

    expect(payload.sizes?.[0]).toEqual({
      name: 'S',
      productMeasurements: [
        { name: 'Shoulder', value: '48', unit: 'cm' },
        { name: 'Bust', value: '110', unit: 'cm' },
        { name: 'Length', value: '66', unit: 'cm' },
        { name: 'Sleeve Length', value: '63', unit: 'cm' },
      ],
      bodyMeasurements: [],
    });
    expect(payload.sizes?.map((size) => size.name)).toEqual(['S', 'M']);
  });

  it('omits measurement columns that are absent from a size row', () => {
    const item = {
      ...ITEM,
      sizeChart: [{ Size: 'XS', Bust: 110, Length: 68, 'Sleeve Length': 76 }],
    };

    const payload = buildSeedProductPayload(item, 0, REFS);

    expect(payload.sizes?.[0]?.productMeasurements?.map((row) => row.name)).toEqual([
      'Bust',
      'Length',
      'Sleeve Length',
    ]);
  });

  it('emits one sellable SKU per colour variant and size with a single default', () => {
    const payload = buildSeedProductPayload(ITEM, 4, REFS);

    expect(payload.skus).toHaveLength(4);
    expect(payload.skus?.[0]).toMatchObject({
      skuCode: 'CEL-JKT-5-V1-BLUE-S',
      selectedOptions: { Color: 'Blue', Size: 'S' },
      stock: 25,
      isDefault: true,
    });
    expect(payload.skus?.filter((sku) => sku.isDefault)).toHaveLength(1);
    expect(payload.skus?.[3]?.selectedOptions).toEqual({ Color: 'Black', Size: 'M' });
  });

  it('falls back to a carrier image and colour code when variant details are missing', () => {
    const item = { ...ITEM, variants: [{ color: 'Mystery' }] };

    const payload = buildSeedProductPayload(item, 0, REFS);

    expect(payload.colorVariants?.[0]?.colorCode).toBe('#2C3E50');
    expect(payload.colorVariants?.[0]?.images).toHaveLength(1);
    expect(payload.colorVariants?.[0]?.images?.[0]).toMatch(/^https:\/\/images\.unsplash\.com/);
  });

  it('carries the dataset contract into the payload', () => {
    const payload = buildSeedProductPayload(ITEM, 0, REFS);

    expect(payload.name).toBe('Manfinity Test Denim Jacket');
    expect(payload.brand).toBe('Celebs Denim');
    expect(payload.brandId).toBe('brand-denim');
    expect(payload.categoryId).toBe('cat-parent');
    expect(payload.subcategoryId).toBe('cat-child');
    expect(payload.price).toBe(2800);
    expect(payload.discountedPrice).toBe(2380);
    expect(payload.featured).toBe(true);
    expect(payload.status).toBe('published');
    expect(payload.tags).toEqual(['denim', 'jacket']);
    expect(payload.variantOptions).toEqual([
      { name: 'Color', values: ['Blue', 'Black'] },
      { name: 'Size', values: ['S', 'M'] },
    ]);
    expect(payload.mainImages).toEqual([
      'https://img.test/blue-1.jpg',
      'https://img.test/black-1.jpg',
    ]);
    expect(payload.dynamicData?.values).toEqual(ITEM.attributes);
  });
});

describe('products.json dataset integrity', () => {
  const items = readProductDataset();

  it('has unique product names', () => {
    const names = items.map((item) => item.name.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it('every item carries the fields the importer needs', () => {
    for (const item of items) {
      expect(item.categorySlug).toBeTruthy();
      expect(item.brandSlug).toBeTruthy();
      expect(item.vendorShopName).toBeTruthy();
      expect(item.skuPrefix).toBeTruthy();
      expect(item.stockPerSize).toBeGreaterThan(0);
      expect(item.price).toBeGreaterThan(0);
      expect(item.discountedPrice).toBeGreaterThan(0);
      expect(item.discountedPrice).toBeLessThanOrEqual(item.price);
      expect(item.variants.length).toBeGreaterThan(0);
      expect(item.sizeChart.length).toBeGreaterThan(0);
      for (const row of item.sizeChart) {
        expect(row.Size).toBeTruthy();
      }
      for (const variant of item.variants) {
        expect(variant.color).toBeTruthy();
        expect(variant.images?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('uses Title Case attribute keys with no legacy cruft', () => {
    for (const item of items) {
      for (const key of Object.keys(item.attributes)) {
        expect(key).toMatch(/^[A-Z0-9]/);
        expect(key).not.toMatch(/[a-z][A-Z]/);
        expect(key.startsWith('Pants')).toBe(false);
      }
    }
  });
});
