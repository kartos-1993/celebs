import { describe, it, expect, vi } from 'vitest';
import { buildProductPayload } from '../add-product-payload';
import { ProductApiService } from '../../api';

describe('buildProductPayload', () => {
  it('should construct a valid CreateProductRequest payload from form values', async () => {
    vi.spyOn(ProductApiService, 'uploadFiles').mockResolvedValue(['https://example.com/image.jpg']);

    const fields: any[] = [];
    const values = {
      name: '  Test Polo Shirt  ',
      brand: 'Manfinity',
      description: '  Comfortable cotton polo shirt.  ',
      price: 1500,
      specialPrice: 1200,
      categoryId: '60c72b2f9b1d8b2d88a12345',
      subcategoryId: '60c72b2f9b1d8b2d88a67890',
      mainImage: ['https://example.com/image.jpg'],
    };

    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values,
    });

    expect(payload.name).toBe('Test Polo Shirt');
    expect(payload.brand).toBe('Manfinity');
    expect(payload.description).toBe('Comfortable cotton polo shirt.');
    expect(payload.price).toBe(1500);
    expect(payload.discountedPrice).toBe(1200);
    expect(payload.categoryId).toBe('60c72b2f9b1d8b2d88a12345');
    expect(payload.subcategoryId).toBe('60c72b2f9b1d8b2d88a67890');
    expect(payload.status).toBe('draft');
    expect(payload.colorVariants).toHaveLength(1);
    expect(payload.colorVariants[0].name).toBe('Default');
  });

  it('should throw an error if regular price is missing or invalid', async () => {
    vi.spyOn(ProductApiService, 'uploadFiles').mockResolvedValue([]);

    const values = {
      name: 'Invalid Price Product',
      categoryId: '60c72b2f9b1d8b2d88a12345',
      subcategoryId: '60c72b2f9b1d8b2d88a67890',
    };

    await expect(
      buildProductPayload({
        fields: [],
        status: 'draft',
        values,
      })
    ).rejects.toThrow('Add a valid price before publishing the product.');
  });

  it('should throw an error if discounted price is greater than or equal to regular price', async () => {
    vi.spyOn(ProductApiService, 'uploadFiles').mockResolvedValue([]);

    const values = {
      name: 'Overpriced Discount Product',
      price: 1000,
      specialPrice: 1200,
      categoryId: '60c72b2f9b1d8b2d88a12345',
      subcategoryId: '60c72b2f9b1d8b2d88a67890',
    };

    await expect(
      buildProductPayload({
        fields: [],
        status: 'draft',
        values,
      })
    ).rejects.toThrow('Discounted price must be less than the regular price.');
  });
});
