import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import { buildProductPayload } from '../add-product-payload';

describe('buildProductPayload', () => {
  const fields: FieldSpec[] = [
    { name: 'name', uiType: 'input', label: 'Product Name', group: 'base', required: true },
    { name: 'Color', uiType: 'multiselect', label: 'Available Colors', group: 'variant' },
    { name: 'Size', uiType: 'multiselect', label: 'Available Sizes', group: 'variant' },
  ];

  const mockUpload = vi.fn().mockImplementation(async (files: unknown[]) => {
    return files.map((f, i) =>
      typeof f === 'string' ? f : `https://cdn.example.com/uploaded-${i}.jpg`,
    );
  });

  it('should throw an error when price is missing', async () => {
    await expect(
      buildProductPayload({
        fields,
        status: 'draft',
        values: { name: 'Test Product' },
        upload: mockUpload,
      }),
    ).rejects.toThrow('Add a valid price before publishing the product.');
  });

  it('should throw an error when discountedPrice is greater than or equal to regular price', async () => {
    await expect(
      buildProductPayload({
        fields,
        status: 'draft',
        values: {
          name: 'Test Product',
          price: 1000,
          specialPrice: 1200,
          'sku.default.price': '1000',
          'sku.default.specialPrice': '1200',
        },
        upload: mockUpload,
      }),
    ).rejects.toThrow('Discounted price must be less than the regular price.');
  });

  it('should generate valid 2D matrix payload with color variants and stocks', async () => {
    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values: {
        name: 'Chiffon Shirt',
        brand: 'H&M',
        description: 'Casual shirt for daily wear',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red', 'Navy'],
        Size: ['S', 'M'],
        'sku.default.price': '2000',
        'sku.default.stock': '10',
        'sku.variants.Color.Red.Size.S.price': '2000',
        'sku.variants.Color.Red.Size.S.stock': '15',
        'sku.variants.Color.Red.Size.M.price': '2000',
        'sku.variants.Color.Red.Size.M.stock': '20',
        'sku.variants.Color.Navy.Size.S.price': '2200',
        'sku.variants.Color.Navy.Size.S.stock': '5',
        'sku.variants.Color.Navy.Size.M.price': '2200',
        'sku.variants.Color.Navy.Size.M.stock': '8',
        mainImage: ['https://example.com/main.jpg'],
      },
      upload: mockUpload,
    });

    expect(payload.name).toBe('Chiffon Shirt');
    expect(payload.brand).toBe('H&M');
    expect(payload.price).toBe(2000);
    expect(payload.colorVariants).toBeDefined();
    const variants = payload.colorVariants!;
    expect(variants).toHaveLength(2);
    expect(variants[0].name).toBe('Red');
    expect(variants[0].stocks).toEqual([
      { size: 'S', quantity: 15 },
      { size: 'M', quantity: 20 },
    ]);
    expect(variants[1].name).toBe('Navy');
    expect(variants[1].stocks).toEqual([
      { size: 'S', quantity: 5 },
      { size: 'M', quantity: 8 },
    ]);
  });

  it('should derive the cover from the first color gallery when main images are empty', async () => {
    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values: {
        name: 'Coverless Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        Size: ['M'],
        'sku.default.price': '1500',
        'sku.default.stock': '7',
        mainImage: [],
        variants: {
          colorMeta: {
            Red: { images: ['https://example.com/red-1.jpg'], hot: false },
          },
        },
      },
      upload: mockUpload,
    });

    expect(payload.mainImages).toEqual(['https://example.com/red-1.jpg']);
    expect(payload.colorVariants?.[0]?.images).toEqual(['https://example.com/red-1.jpg']);
  });

  it('should prefer explicit main images over color galleries for the cover', async () => {
    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values: {
        name: 'Covered Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        Size: ['M'],
        'sku.default.price': '1500',
        'sku.default.stock': '7',
        mainImage: ['https://example.com/cover.jpg'],
        variants: {
          colorMeta: {
            Red: { images: ['https://example.com/red-1.jpg'], hot: false },
          },
        },
      },
      upload: mockUpload,
    });

    expect(payload.mainImages).toEqual(['https://example.com/cover.jpg']);
  });
});
