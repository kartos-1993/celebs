import { describe, expect,it } from 'vitest';

import { createProductSchema } from '@celebs/shared-types';

describe('Product Specifications & Size Measurements', () => {
  const baseValidProduct = {
    name: 'Solid Ribbed Long Sleeve Polo Shirt',
    brand: 'Manfinity',
    description:
      'High-quality knit polo shirt with ribbed design, long sleeves, and classic lapel collar.',
    price: 1200,
    discountedPrice: 1100,
    categoryId: '6a4f4c54-12b4-4bc4-d15b-5633a0000000',
    subcategoryId: '6a4f4c54-12b4-4bc4-d15b-5633a0000000',
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

  it('should pass validation when size measurements have empty or partial values', () => {
    const productWithPartialMeasurements = {
      ...baseValidProduct,
      sizes: [
        {
          name: 'M',
          productMeasurements: [
            { name: 'Shoulder', value: '45', unit: 'cm' },
            { name: 'Bust', value: '', unit: 'cm' }, // empty optional column
          ],
          bodyMeasurements: [
            { name: 'Height', value: '', unit: 'cm' }, // unselected body measurement tab
          ],
        },
      ],
    };
    const result = createProductSchema.safeParse(productWithPartialMeasurements);
    expect(result.success).toBe(true);
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

  it('should pass validation for body measurement range values (e.g. 100-200, 32-34)', () => {
    const productWithRanges = {
      ...baseValidProduct,
      sizes: [
        {
          name: 'M',
          productMeasurements: [
            { name: 'Shoulder', value: '45', unit: 'cm' },
            { name: 'Bust', value: '100', unit: 'cm' },
          ],
          bodyMeasurements: [
            { name: 'Height', value: '170-180', unit: 'cm' },
            { name: 'Waist', value: '32-34', unit: 'in' },
            { name: 'Bust', value: '95 - 105', unit: 'cm' },
          ],
        },
      ],
    };
    const result = createProductSchema.safeParse(productWithRanges);
    expect(result.success).toBe(true);
  });
});
