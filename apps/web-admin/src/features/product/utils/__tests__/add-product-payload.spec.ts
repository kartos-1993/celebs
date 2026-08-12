import { describe, expect, it, vi } from 'vitest';
import { buildProductPayload } from '../add-product-payload';
import type { FieldSpec } from '../../types';

/**
 * Injected directly — the previous spyOn on ProductApiService never
 * intercepted the named import used by buildProductPayload.
 */
const fakeUpload = vi.fn(async (files: Array<File | string | null | undefined>) =>
  files.filter((file): file is string => typeof file === 'string' && file.length > 0),
);

describe('buildProductPayload', () => {
  it('constructs a valid payload from form values', async () => {
    const values = {
      name: '  Test Polo Shirt  ',
      brand: 'Manfinity',
      description: '  Comfortable cotton polo shirt.  ',
      price: 1500,
      specialPrice: 1200,
      categoryId: '60c72b2f9b1d8b2d88a12345',
      subcategoryId: '60c72b2f9b1d8b2d88a67890',
      mainImage: ['https://example.com/image.jpg'],
      Material: 'Cotton',
    };

    const fields: FieldSpec[] = [
      { name: 'Material', uiType: 'select', label: 'Material', group: 'details' },
    ];

    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values,
      upload: fakeUpload,
    });

    expect(payload.name).toBe('Test Polo Shirt');
    expect(payload.brand).toBe('Manfinity');
    expect(payload.description).toBe('Comfortable cotton polo shirt.');
    expect(payload.price).toBe(1500);
    expect(payload.discountedPrice).toBe(1200);
    expect(payload.categoryId).toBe('60c72b2f9b1d8b2d88a12345');
    expect(payload.subcategoryId).toBe('60c72b2f9b1d8b2d88a67890');
    expect(payload.status).toBe('draft');
    expect(payload.mainImages).toEqual(['https://example.com/image.jpg']);
    expect(payload.colorVariants).toHaveLength(1);
    expect(payload.colorVariants?.[0]?.name).toBe('Default');
    expect(payload.dynamicData?.values).toEqual({
      Material: 'Cotton',
    });
    expect(fakeUpload).toHaveBeenCalled();
  });

  it('throws when the regular price is missing or invalid', async () => {
    const values = {
      name: 'Invalid Price Product',
      categoryId: '60c72b2f9b1d8b2d88a12345',
      subcategoryId: '60c72b2f9b1d8b2d88a67890',
    };

    await expect(
      buildProductPayload({ fields: [], status: 'draft', values, upload: fakeUpload }),
    ).rejects.toThrow('Add a valid price before publishing the product.');
  });

  it('throws when discounted price >= regular price', async () => {
    const values = {
      name: 'Overpriced Discount Product',
      price: 1000,
      specialPrice: 1200,
      categoryId: '60c72b2f9b1d8b2d88a12345',
      subcategoryId: '60c72b2f9b1d8b2d88a67890',
    };

    await expect(
      buildProductPayload({ fields: [], status: 'draft', values, upload: fakeUpload }),
    ).rejects.toThrow('Discounted price must be less than the regular price.');
  });
});
