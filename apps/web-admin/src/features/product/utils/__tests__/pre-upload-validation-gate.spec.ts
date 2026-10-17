import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import { buildProductPayload } from '../add-product-payload';

const mockFields: FieldSpec[] = [
  { name: 'name', label: 'Product Name', uiType: 'input', group: 'basic', required: true },
  { name: 'price', label: 'Price', uiType: 'number', group: 'pricing', required: true },
  {
    name: 'specialPrice',
    label: 'Discounted Price',
    uiType: 'number',
    group: 'pricing',
    required: false,
  },
  {
    name: 'mainImages',
    label: 'Main Images',
    uiType: 'MainImage',
    group: 'media',
    required: false,
  },
];

describe('Pre-Upload Validation Gate & Draft Payload', () => {
  it('throws error and prevents upload execution when discounted price is greater than or equal to regular price', async () => {
    const uploadSpy = vi.fn().mockResolvedValue(['https://cdn.example.com/test.jpg']);

    await expect(
      buildProductPayload({
        fields: mockFields,
        status: 'published',
        values: {
          name: 'Classic Oxford Shirt',
          categoryId: 'cat-apparel',
          subcategoryId: 'sub-shirts',
          price: 1000,
          specialPrice: 1200,
          mainImages: [new File(['dummy'], 'shirt.jpg', { type: 'image/jpeg' })],
        },
        upload: uploadSpy,
      }),
    ).rejects.toThrow('Discounted price must be less than the regular price.');

    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('throws error and prevents upload execution when regular price is missing for published product', async () => {
    const uploadSpy = vi.fn().mockResolvedValue(['https://cdn.example.com/test.jpg']);

    await expect(
      buildProductPayload({
        fields: mockFields,
        status: 'published',
        values: {
          name: 'Classic Oxford Shirt',
          categoryId: 'cat-apparel',
          subcategoryId: 'sub-shirts',
          mainImages: [new File(['dummy'], 'shirt.jpg', { type: 'image/jpeg' })],
        },
        upload: uploadSpy,
      }),
    ).rejects.toThrow('Add a valid price before publishing the product.');

    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('allows saving backend draft with valid price and uploads attached assets', async () => {
    const uploadSpy = vi.fn().mockResolvedValue(['https://cdn.example.com/draft.jpg']);

    const payload = await buildProductPayload({
      fields: mockFields,
      status: 'draft',
      values: {
        name: 'Work In Progress Jacket',
        categoryId: 'cat-apparel',
        subcategoryId: 'sub-jackets',
        price: 2500,
        mainImages: ['https://cdn.example.com/draft.jpg'],
      },
      upload: uploadSpy,
    });

    expect(payload.status).toBe('draft');
    expect(payload.name).toBe('Work In Progress Jacket');
    expect(payload.price).toBe(2500);
    expect(uploadSpy).toHaveBeenCalled();
  });
});
