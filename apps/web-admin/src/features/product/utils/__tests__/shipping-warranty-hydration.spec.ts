import { describe, expect, it } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import { hydrateProductForm } from '../hydrate-product-form';

describe('Shipping and Warranty Form Hydration', () => {
  it('populates custom parcel dimensions and warranty without overriding to defaults', () => {
    const product: AdminProductDetail = {
      id: 'prod-heavy-jacket',
      name: 'Winter Parka Down Jacket',
      price: 5500,
      status: 'published',
      categoryId: 'cat-outerwear',
      packageWeightKg: 1.25,
      packageLengthCm: 40,
      packageWidthCm: 30,
      packageHeightCm: 10,
      packagingType: 'BOX_STANDARD',
      isFragile: false,
      hasBatteryOrLiquid: false,
      warrantyType: 'BRAND_WARRANTY',
      warrantyPeriod: '1 Year Fabric Guarantee',
      warrantyPolicy: 'Covers zip and down-feather leak defects.',
      isNonReturnable: true,
      mainImages: ['https://cdn.example.com/jacket.jpg'],
    };

    const hydrated = hydrateProductForm(product);

    expect(hydrated.packageWeightKg).toBe(1.25);
    expect(hydrated.packageLengthCm).toBe(40);
    expect(hydrated.packageWidthCm).toBe(30);
    expect(hydrated.packageHeightCm).toBe(10);
    expect(hydrated.packagingType).toBe('BOX_STANDARD');
    expect(hydrated.isFragile).toBe(false);
    expect(hydrated.hasBatteryOrLiquid).toBe(false);
    expect(hydrated.warrantyType).toBe('BRAND_WARRANTY');
    expect(hydrated.warrantyPeriod).toBe('1 Year Fabric Guarantee');
    expect(hydrated.warrantyPolicy).toBe('Covers zip and down-feather leak defects.');
    expect(hydrated.isNonReturnable).toBe(true);
  });

  it('falls back cleanly to shipping defaults when editing legacy product with null logistics specifications', () => {
    const legacyProduct: AdminProductDetail = {
      id: 'prod-legacy',
      name: 'Simple Vintage Cap',
      price: 750,
      status: 'draft',
      categoryId: 'cat-accessories',
      packageWeightKg: undefined,
      packageLengthCm: null,
      packageWidthCm: null,
      packageHeightCm: null,
      packagingType: undefined,
      isFragile: undefined,
      hasBatteryOrLiquid: undefined,
      warrantyType: undefined,
      warrantyPeriod: null,
      warrantyPolicy: null,
      isNonReturnable: undefined,
    };

    const hydrated = hydrateProductForm(legacyProduct);

    expect(hydrated.packageWeightKg).toBe(0.5); // Default courier weight floor
    expect(hydrated.packageLengthCm).toBeUndefined();
    expect(hydrated.packageWidthCm).toBeUndefined();
    expect(hydrated.packageHeightCm).toBeUndefined();
    expect(hydrated.packagingType).toBe('FLYER_SMALL');
    expect(hydrated.warrantyType).toBe('NO_WARRANTY');
    expect(hydrated.warrantyPeriod).toBe('');
    expect(hydrated.warrantyPolicy).toBe('');
    expect(hydrated.isNonReturnable).toBe(false);
  });
});
