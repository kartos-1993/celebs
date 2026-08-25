import { describe, expect, it } from 'vitest';

import type { ProductRecord } from '../../types';
import { hydrateProductForm, toCategoryPath } from '../hydrate-product-form';

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
    const product: ProductRecord = {
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
    const product: ProductRecord = {
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
});
