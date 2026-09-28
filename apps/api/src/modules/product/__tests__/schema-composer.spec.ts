import { describe, expect, it, vi } from 'vitest';

import { baseProductSchema, createProductSchema, updateProductSchema } from '@celebs/shared-types';

import { composeSchema } from '../schema-composer';

vi.mock('@/config/db.prisma', () => ({
  default: {
    optionSet: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

const minimalPolicy = {
  media: { maxImages: 8, maxSizeBytes: 5 * 1024 * 1024, accept: ['image/jpeg'] },
};

/** The only field spec the renderer registers as the cover gallery. */
async function coverFieldName(): Promise<string | undefined> {
  const composed = await composeSchema({
    category: { id: 'cat-1', name: 'Shirts', attributes: [] },
    locale: 'en_US',
    policy: minimalPolicy,
  });
  return composed.fields.find((field) => field.uiType === 'MainImage')?.name;
}

describe('cover field spec name == product write contract name', () => {
  it('names the MainImage field spec exactly as the write contract accepts it', async () => {
    const name = await coverFieldName();
    expect(name).toBeDefined();
    // The field spec's `name` is the key the dynamic form POSTS. Zod runs in
    // default `strip` mode, so any name the write contract does not declare is
    // dropped SILENTLY on the way in — the client then had to bridge the two
    // spellings itself. One name, end to end. (`baseProductSchema` is the
    // shared object both create and update refine, so it is the declared key
    // set; the refined wrappers have no `.shape`.)
    expect(Object.keys(baseProductSchema.shape)).toContain(name);
  });

  it('is the plural gallery key, never the singular alias Zod strips', async () => {
    const name = await coverFieldName();
    expect(name).toBe('mainImages');
    // Proof of the harm the rename removes, not just of the new spelling: a
    // `mainImage` key parsed by the write contract comes out as nothing.
    const parsed = createProductSchema.parse({
      name: 'Shirt',
      price: 100,
      categoryId: '11111111-1111-4111-8111-111111111111',
      subcategoryId: '22222222-2222-4222-8222-222222222222',
      mainImage: ['https://cdn.example.com/cover.jpg'],
    });
    expect(parsed.mainImages).toEqual([]);
    expect('mainImage' in parsed).toBe(false);
  });

  it('is the same key an update round trip keeps', async () => {
    const name = await coverFieldName();
    const cover = ['https://cdn.example.com/cover.jpg'];
    // `updateProductSchema` is a refined ZodEffects (no `.shape`), so it is
    // exercised by parsing: the gallery the field spec names must SURVIVE the
    // write contract, which is the only thing that matters for an edit.
    const parsed = updateProductSchema.parse({ [name as string]: cover });
    expect((parsed as Record<string, unknown>)[name as string]).toEqual(cover);
  });
});

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
