import { describe, expect, it } from 'vitest';

import type { AdminProductDetail } from '@celebs/shared-types';

import {
  extractColorNames,
  extractSizeNames,
  hydrateProductForm,
  resolveSkuPathPrefixes,
  toCategoryPath,
} from '../hydrate-product-form';

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
    const product: AdminProductDetail = {
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

    const hydrated = hydrateProductForm(product);
    expect(hydrated.Color).toEqual(['Blue']);
    expect(hydrated['variants.colorMeta.Blue.swatch']).toBe('https://example.com/blue-swatch.png');
    expect(hydrated['variants.colorMeta.Blue.hot']).toBe(true);
    expect(hydrated['sku.variants.Color.Blue.Size.M.price']).toBe('4000');
    expect(hydrated['sku.variants.Color.Blue.Size.M.specialPrice']).toBe('3500');
    expect(hydrated['sku.variants.Color.Blue.Size.M.stock']).toBe('15');
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
    expect(hydrated.packageWeightKg).toBe(0.3);
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
    expect(hydrated['sku.default.sellerSku']).toBe('CLB-BAG-001');
    expect(hydrated['sku.default.price']).toBe('4500');
    expect(hydrated['sku.default.specialPrice']).toBe('3999');
    expect(hydrated['sku.default.stock']).toBe('12');
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
    expect(hydrated['sku.variants.size.S.sellerSku']).toBe('TEE-S');
    expect(hydrated['sku.variants.size.M.sellerSku']).toBe('TEE-M');
  });
});

describe('resolveSkuPathPrefixes', () => {
  it('resolves both legacy and canonical paths for 2D variants (color and size)', () => {
    const prefixes = resolveSkuPathPrefixes('Red', 'M');
    expect(prefixes).toEqual(['sku.variants.Red.M', 'sku.variants.Color.Red.Size.M']);
  });

  it('resolves color-only variant paths when size is absent', () => {
    const prefixes = resolveSkuPathPrefixes('Blue', undefined);
    expect(prefixes).toEqual([
      'sku.variants.Blue',
      'sku.variants.color.Blue',
      'sku.variants.Color.Blue',
    ]);
  });

  it('resolves size-only variant paths when color is absent', () => {
    const prefixes = resolveSkuPathPrefixes(undefined, 'XL');
    expect(prefixes).toEqual(['sku.variants.XL', 'sku.variants.size.XL', 'sku.variants.Size.XL']);
  });

  it('returns empty array when neither color nor size is present', () => {
    expect(resolveSkuPathPrefixes(undefined, undefined)).toEqual([]);
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
