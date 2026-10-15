import { describe, expect, it } from 'vitest';

import {
  buildDenimJacketPayload,
  buildDenimJeansPayload,
  resolveSeedColorHex,
  type DenimSeedItem,
} from '../product-seed-payloads';

const REFS = {
  brandId: 'brand-denim',
  brandName: 'Celebs Denim',
  categoryId: 'cat-parent',
  subcategoryId: 'cat-child',
};

const JACKET_ITEM: DenimSeedItem = {
  title: 'Manfinity Test Denim Jacket',
  attributes: { material: '100% Cotton Denim', style: 'Streetwear' },
  variants: [
    { color: 'Blue', images: ['https://img.test/blue-1.jpg', 'https://img.test/blue-2.jpg'] },
    { color: 'Black', images: ['https://img.test/black-1.jpg'] },
  ],
  measurements: {
    sizeChart: [
      { size: 'S', shoulder: 48, chest: 110, length: 66, sleeveLength: 63 },
      { size: 'M', shoulder: 50, chest: 115, length: 68, sleeveLength: 64 },
    ],
  },
};

const JEANS_ITEM: DenimSeedItem = {
  title: 'Manfinity Test Denim Jeans',
  attributes: { material: 'Cotton Viscose Denim', fitType: 'Relaxed', color: 'Beige' },
  variants: [{ color: 'Beige', images: ['https://img.test/beige-1.jpg'] }],
  measurements: {
    sizeChart: [
      { size: 'M', waist: 86, hip: 112, inseam: 77, thigh: 74 },
      { size: 'L', waist: 91, hip: 117, inseam: 77.8, thigh: 77.3 },
    ],
  },
};

describe('buildDenimJacketPayload', () => {
  it('labels measurements with the seeded category size-chart contract', () => {
    const payload = buildDenimJacketPayload(JACKET_ITEM, 0, REFS);

    // 'Men Denim Jackets' declares Shoulder/Bust/Length/Sleeve Length. The
    // payload previously shipped 'Chest', which drifted from the schema the
    // vendor form and the size chart render from.
    expect(payload.sizes?.[0]?.productMeasurements).toEqual([
      { name: 'Shoulder', value: '48', unit: 'cm' },
      { name: 'Bust', value: '110', unit: 'cm' },
      { name: 'Length', value: '66', unit: 'cm' },
      { name: 'Sleeve Length', value: '63', unit: 'cm' },
    ]);
  });

  it('emits one sellable SKU per colour variant and size', () => {
    const payload = buildDenimJacketPayload(JACKET_ITEM, 0, REFS);

    expect(payload.colorVariants).toHaveLength(2);
    expect(payload.skus).toHaveLength(4);
    for (const sku of payload.skus ?? []) {
      expect(sku.stock).toBeGreaterThan(0);
      expect(sku.skuCode).toMatch(/^CEL-JKT-1-/);
    }
    expect(payload.skus?.filter((sku) => sku.isDefault)).toHaveLength(1);
  });

  it('publishes with resolved refs, cover images and the first-item flag', () => {
    const payload = buildDenimJacketPayload(JACKET_ITEM, 0, REFS);

    expect(payload.brand).toBe('Celebs Denim');
    expect(payload.brandId).toBe('brand-denim');
    expect(payload.categoryId).toBe('cat-parent');
    expect(payload.subcategoryId).toBe('cat-child');
    expect(payload.status).toBe('published');
    expect(payload.featured).toBe(true);
    expect(payload.mainImages).toHaveLength(3); // aggregated across both colour variants
  });

  it('falls back to the canonical size chart when the dataset row has none', () => {
    const payload = buildDenimJacketPayload(
      { title: 'No chart', variants: [{ color: 'Black', images: ['https://img.test/x.jpg'] }] },
      1,
      REFS,
    );

    expect(payload.sizes?.map((size) => size.name)).toEqual(['S', 'M', 'L', 'XL']);
    expect(payload.skus).toHaveLength(4);
    expect(payload.featured).toBe(false);
  });
});

describe('buildDenimJeansPayload', () => {
  it('labels measurements with the seeded category size-chart contract', () => {
    const payload = buildDenimJeansPayload(JEANS_ITEM, 0, REFS);

    expect(payload.sizes?.[0]?.productMeasurements).toEqual([
      { name: 'Waist Size', value: '86', unit: 'cm' },
      { name: 'Hip Size', value: '112', unit: 'cm' },
      { name: 'Length', value: '77', unit: 'cm' },
      { name: 'Thigh', value: '74', unit: 'cm' },
    ]);
  });

  it('falls back to a carrier colour variant when the dataset row has none', () => {
    const payload = buildDenimJeansPayload({ title: 'No variants' }, 0, REFS);

    expect(payload.colorVariants?.map((variant) => variant.name)).toEqual(['Denim Blue']);
    expect(payload.colorVariants?.[0]?.stocks).toHaveLength(payload.sizes?.length ?? 0);
    expect(payload.mainImages?.length).toBeGreaterThan(0);
  });
});

describe('resolveSeedColorHex', () => {
  it('maps known colour names and falls back for unknown ones', () => {
    expect(resolveSeedColorHex('Black')).toBe('#1A1A1A');
    expect(resolveSeedColorHex('Beige')).toBe('#D4BE8D');
    expect(resolveSeedColorHex('Plum')).toBe('#2C3E50');
  });
});
