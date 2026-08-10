import { describe, it, expect, vi } from 'vitest';
import { createProductSchema } from '@celebs/shared-types';

describe('Product Specifications & Size Measurements', () => {
  const baseValidProduct = {
    name: 'Solid Ribbed Long Sleeve Polo Shirt',
    brand: 'Manfinity',
    description:
      'High-quality knit polo shirt with ribbed design, long sleeves, and classic lapel collar.',
    price: 1200,
    discountedPrice: 1100,
    categoryId: '6a4f4c5412b44bc4d15b5633',
    subcategoryId: '6a4f4c5412b44bc4d15b5633',
    sizes: [
      {
        name: 'M',
        productMeasurements: [
          { name: 'Shoulder', value: '45', unit: 'cm' },
          { name: 'Bust', value: '100', unit: 'cm' },
        ],
        bodyMeasurements: [{ name: 'Height', value: '175', unit: 'cm' }],
      },
    ],
    colorVariants: [
      {
        name: 'Blue',
        colorCode: '#0000FF',
        images: ['https://example.com/blue.jpg'],
        stocks: [{ size: 'M', quantity: 15 }],
      },
    ],
    mainImages: ['https://example.com/main.jpg'],
    status: 'draft' as const,
  };

  it('should pass validation for a complete product with size measurements', () => {
    const result = createProductSchema.safeParse(baseValidProduct);
    expect(result.success).toBe(true);
  });

  it('should fail validation if a size measurement value is missing', () => {
    const invalidProduct = {
      ...baseValidProduct,
      sizes: [
        {
          name: 'M',
          productMeasurements: [
            { name: 'Shoulder', value: '', unit: 'cm' }, // empty value
          ],
        },
      ],
    };
    const result = createProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.join('.').includes('value'));
      expect(issue?.message).toBe('Measurement value is required');
    }
  });

  it('should fail validation if discountedPrice is higher than price', () => {
    const invalidProduct = {
      ...baseValidProduct,
      price: 1000,
      discountedPrice: 1200,
    };
    const result = createProductSchema.safeParse(invalidProduct);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Discounted price must be less than the regular price',
      );
    }
  });
});
