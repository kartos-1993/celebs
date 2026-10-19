import { describe, expect, it } from 'vitest';

import type { SeedProductItem } from '../../../db/seed/seed-products';
import { type BatchItem, mergeBatch, resolveBrandSlug, toCanonicalItem } from '../merge-seed-batch';

const BATCH_ITEM: BatchItem = {
  name: 'Manfinity Test Hoodie',
  description: 'A scraper batch hoodie.',
  price: 3040,
  discountedPrice: 2580,
  brand: 'Manfinity',
  vendor: 'Brothers Collection',
  subcategorySlug: 'men-hoodies',
  sizes: [
    {
      name: 'XS',
      productMeasurements: [
        { name: 'Shoulder', value: '46' },
        { name: 'Bust', value: '104' },
      ],
    },
    {
      name: 'S',
      productMeasurements: [
        { name: 'Shoulder', value: '47.5' },
        { name: 'Bust', value: '108' },
      ],
    },
  ],
  variants: [
    { color: 'Black', images: ['https://img.test/black-1.jpg', 'https://img.test/black-2.jpg'] },
    { color: 'Blue', images: ['https://img.test/blue-1.jpg'] },
  ],
  colorVariants: [
    { name: 'Black', colorCode: '#1A1A1A', images: ['https://img.test/black-1.jpg'] },
    { name: 'Blue', colorCode: '#1E90FF', images: ['https://img.test/blue-1.jpg'] },
  ],
  skus: [{ quantity: 20 }],
  mainImages: ['https://img.test/cover-1.jpg'],
  dynamicData: {
    values: {
      'Ideal for': 'conventional',
      'Number of Pieces': '1 Piece Set',
      'Care Instructions': 'Machine wash',
    },
  },
  packageWeightKg: 0.6,
  packageLengthCm: 35,
  packageWidthCm: 28,
  packageHeightCm: 6,
  packagingType: 'FLYER_MEDIUM',
  isFragile: false,
  hasBatteryOrLiquid: false,
  isNonReturnable: false,
  warrantyType: 'BRAND_WARRANTY',
  warrantyPeriod: '3 Months',
  warrantyPolicy: '3 months coverage against knit unraveling and seam failure.',
};

const DATASET_ITEM: SeedProductItem = {
  name: 'Existing Product',
  categorySlug: 'men-hoodies',
  brandSlug: 'generic-unbranded',
  vendorShopName: 'Brothers Collection',
  description: 'Existing.',
  price: 1000,
  discountedPrice: 900,
  skuPrefix: 'BRO-HOO',
  stockPerSize: 20,
  attributes: {},
  sizeChart: [{ Size: 'M' }],
  variants: [{ color: 'Black', images: ['https://img.test/existing.jpg'] }],
};

describe('toCanonicalItem', () => {
  it('maps a batch payload onto the canonical dataset contract', () => {
    const item = toCanonicalItem(BATCH_ITEM);

    expect(item.name).toBe('Manfinity Test Hoodie');
    expect(item.categorySlug).toBe('men-hoodies');
    expect(item.brandSlug).toBe('generic-unbranded');
    expect(item.vendorShopName).toBe('Brothers Collection');
    expect(item.skuPrefix).toBe('BRO-HOO');
    expect(item.stockPerSize).toBe(20);
    expect(item.featured).toBe(false);
    expect(item.sizeChart).toEqual([
      { Size: 'XS', Shoulder: 46, Bust: 104 },
      { Size: 'S', Shoulder: 47.5, Bust: 108 },
    ]);
    expect(item.variants).toEqual([
      {
        color: 'Black',
        colorCode: '#1A1A1A',
        images: ['https://img.test/black-1.jpg', 'https://img.test/black-2.jpg'],
      },
      { color: 'Blue', colorCode: '#1E90FF', images: ['https://img.test/blue-1.jpg'] },
    ]);
    expect(item.attributes).toEqual({
      'Ideal For': 'conventional',
      'Number Of Pieces': '1 Piece Set',
      'Care Instructions': 'Machine wash',
    });
    expect(item.mainImages).toEqual(['https://img.test/cover-1.jpg']);
    expect(item.packaging).toEqual({
      weightKg: 0.6,
      lengthCm: 35,
      widthCm: 28,
      heightCm: 6,
      type: 'FLYER_MEDIUM',
      isFragile: false,
      hasBatteryOrLiquid: false,
    });
    expect(item.warranty).toEqual({
      type: 'BRAND_WARRANTY',
      period: '3 Months',
      policy: '3 months coverage against knit unraveling and seam failure.',
      isNonReturnable: false,
    });
  });

  it('normalizes renamed SHEIN spec-table labels onto the men-apparel vocabulary', () => {
    const cases: Array<[string, string, string]> = [
      ['Body', 'Unlined', 'Body / Lining'],
      ['Collar', 'Hooded', 'Neckline'],
      ['Collar / Neckline', 'Lapel / Notched Collar', 'Neckline'],
      ['Neckline / Collar', 'Hooded', 'Neckline'],
      ['Season', 'Winter (<10/50)', 'Temperature'],
      ['Seasons', 'All-Season', 'Temperature'],
    ];

    for (const [label, value, canonical] of cases) {
      const item = toCanonicalItem({
        ...BATCH_ITEM,
        dynamicData: { values: { [label]: value } },
      });

      expect(item.attributes).toEqual({ [canonical]: value });
    }
  });

  it('maps the legacy FLYER_LARGE packaging type to BOX_STANDARD', () => {
    const item = toCanonicalItem({ ...BATCH_ITEM, packagingType: 'FLYER_LARGE' });

    expect(item.packaging?.type).toBe('BOX_STANDARD');
  });

  it('builds variants from colorVariants when variants are missing', () => {
    const { variants: _variants, ...rest } = BATCH_ITEM;

    const item = toCanonicalItem(rest);

    expect(item.variants).toEqual([
      { color: 'Black', colorCode: '#1A1A1A', images: ['https://img.test/black-1.jpg'] },
      { color: 'Blue', colorCode: '#1E90FF', images: ['https://img.test/blue-1.jpg'] },
    ]);
  });
});

describe('resolveBrandSlug', () => {
  it('maps the scraper brand names onto registry slugs', () => {
    expect(resolveBrandSlug('Generic / Unbranded', 'x')).toBe('generic-unbranded');
    expect(resolveBrandSlug('Manfinity', 'x')).toBe('generic-unbranded');
    expect(resolveBrandSlug(undefined, 'x')).toBe('generic-unbranded');
  });
});

describe('mergeBatch', () => {
  it('appends new products to the dataset', () => {
    const result = mergeBatch([DATASET_ITEM], [BATCH_ITEM], false);

    expect(result.added).toEqual(['Manfinity Test Hoodie']);
    expect(result.updated).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.dataset).toHaveLength(2);
  });

  it('skips products already present unless --update is set', () => {
    const existing = { ...DATASET_ITEM, name: BATCH_ITEM.name };

    const skipped = mergeBatch([existing], [BATCH_ITEM], false);
    expect(skipped.skipped).toEqual(['Manfinity Test Hoodie']);
    expect(skipped.dataset[0]).toBe(existing);

    const updated = mergeBatch([existing], [BATCH_ITEM], true);
    expect(updated.updated).toEqual(['Manfinity Test Hoodie']);
    expect(updated.dataset[0]?.mainImages).toEqual(['https://img.test/cover-1.jpg']);
  });
});
