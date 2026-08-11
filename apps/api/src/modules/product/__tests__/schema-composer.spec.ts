import { describe, it, expect, vi } from 'vitest';
import { composeSchema } from '../schema-composer';

vi.mock('@/config/db.prisma', () => ({
  default: {
    optionSet: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('schema-composer', () => {
  it('should emit SkuTableV2 dataSource as an object containing a variants array', async () => {
    const mockCategory = {
      id: 'cat-123',
      name: 'Men Denim Jackets',
      attributes: [
        {
          name: 'Color',
          type: 'multiselect',
          isVariant: true,
          variantType: 'color',
        },
        {
          name: 'Size',
          type: 'multiselect',
          isVariant: true,
          variantType: 'size',
        },
      ],
    };

    const result = await composeSchema({
      category: mockCategory,
      locale: 'en_US',
      policy: {
        media: {
          maxImages: 8,
          maxSizeBytes: 5 * 1024 * 1024,
          accept: ['image/jpeg'],
        },
      },
    });

    const skuField = result.fields.find((f) => f.uiType === 'SkuTableV2');
    expect(skuField).toBeDefined();
    expect(skuField?.dataSource).toEqual({
      variants: [
        { key: 'Color', label: 'Color', type: 'custom' },
        { key: 'Size', label: 'Size', type: 'custom' },
      ],
    });
  });

  it('should emit SizeMeasurementsTable with both product and body charts when present', async () => {
    const mockCategory = {
      id: 'cat-456',
      name: 'Men Shirts',
      attributes: [],
      sizeChartColumns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
      bodyChartColumns: ['Height', 'Bust'],
    };

    const result = await composeSchema({
      category: mockCategory,
      locale: 'en_US',
      policy: {
        media: {
          maxImages: 8,
          maxSizeBytes: 5 * 1024 * 1024,
          accept: ['image/jpeg'],
        },
      },
    });

    const sizeChartField = result.fields.find((f) => f.name === 'sizes');
    expect(sizeChartField).toBeDefined();
    expect(sizeChartField?.dataSource).toEqual({
      charts: [
        {
          key: 'product',
          label: 'Product Measurements (Garment Flat)',
          columns: ['Shoulder', 'Bust', 'Length', 'Sleeve Length'],
        },
        {
          key: 'body',
          label: 'Body Measurements (Wearer Fit Guide)',
          columns: ['Height', 'Bust'],
        },
      ],
    });
  });
});
