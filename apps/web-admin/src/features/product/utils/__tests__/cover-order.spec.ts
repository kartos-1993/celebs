import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import { buildProductPayload, resolveCoverImages } from '../add-product-payload';

/**
 * CANONICAL COVER ORDER (asserted here once, in one file):
 *
 *   cover = mainImages[0] ?? firstColor.galleryImages[0]
 *
 * An explicit main image always wins; the first image of the FIRST color's
 * gallery is the cover only when the form carries no main image at all. All
 * three derivation sites (the color branch, the size-only SKU branch, and
 * `effectiveMainImages`) obey this single rule.
 */
describe('canonical cover order', () => {
  const colorFields: FieldSpec[] = [
    { name: 'name', uiType: 'input', label: 'Product Name', group: 'base', required: true },
    { name: 'Color', uiType: 'multiselect', label: 'Available Colors', group: 'variant' },
  ];

  const sizeFields: FieldSpec[] = [
    { name: 'name', uiType: 'input', label: 'Product Name', group: 'base', required: true },
    { name: 'Size', uiType: 'multiselect', label: 'Available Sizes', group: 'variant' },
  ];

  const mockUpload = vi.fn().mockImplementation(async (files: unknown[]) => {
    return files.map((f, i) =>
      typeof f === 'string' ? f : `https://cdn.example.com/uploaded-${i}.jpg`,
    );
  });

  describe('resolveCoverImages', () => {
    it('keeps explicit main images untouched (mainImages[0] wins)', () => {
      expect(
        resolveCoverImages({
          mainImages: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
          firstColorImages: ['https://example.com/red-1.jpg'],
          isUpdate: false,
        }),
      ).toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
    });

    it('falls back to the first color gallery when there is no main image', () => {
      expect(
        resolveCoverImages({
          mainImages: [],
          firstColorImages: ['https://example.com/red-1.jpg'],
          isUpdate: false,
        }),
      ).toEqual(['https://example.com/red-1.jpg']);
    });

    it('never resurrects a cleared cover on update', () => {
      expect(
        resolveCoverImages({
          mainImages: [],
          firstColorImages: ['https://example.com/red-1.jpg'],
          isUpdate: true,
        }),
      ).toEqual([]);
    });
  });

  it('gives a color without a gallery the first color gallery when no main image exists', async () => {
    const payload = await buildProductPayload({
      fields: colorFields,
      status: 'draft',
      values: {
        name: 'Two Tone Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red', 'Navy'],
        'sku.default.price': '1500',
        'sku.default.stock': '4',
        mainImage: [],
        variants: {
          colorMeta: {
            Red: { images: ['https://example.com/red-1.jpg'], hot: false },
            Navy: { images: [], hot: false },
          },
        },
      },
      upload: mockUpload,
    });

    // Cover list = first color's gallery, so the gallery-less color inherits it
    // instead of shipping zero images.
    expect(payload.mainImages).toEqual(['https://example.com/red-1.jpg']);
    expect(payload.colorVariants?.[0]?.images).toEqual(['https://example.com/red-1.jpg']);
    expect(payload.colorVariants?.[1]?.images).toEqual(['https://example.com/red-1.jpg']);
  });

  it('keeps mainImages[0] as the cover for a gallery-less color when a main image exists', async () => {
    const payload = await buildProductPayload({
      fields: colorFields,
      status: 'draft',
      values: {
        name: 'Two Tone Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red', 'Navy'],
        'sku.default.price': '1500',
        'sku.default.stock': '4',
        mainImage: ['https://example.com/cover.jpg'],
        variants: {
          colorMeta: {
            Red: { images: ['https://example.com/red-1.jpg'], hot: false },
            Navy: { images: [], hot: false },
          },
        },
      },
      upload: mockUpload,
    });

    expect(payload.colorVariants?.[1]?.images).toEqual(['https://example.com/cover.jpg']);
  });

  it('uses mainImages[0] as the size-only SKU image and never invents a color cover', async () => {
    // A size-only product has no color axis, so no color gallery is ever
    // uploaded: the cover can only be mainImages[0]. The stray colorMeta value
    // below proves the fallback does not fire without a color axis.
    const payload = await buildProductPayload({
      fields: sizeFields,
      status: 'draft',
      values: {
        name: 'Size Only Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Size: ['M'],
        'sku.default.price': '1500',
        'sku.default.stock': '3',
        mainImage: ['https://example.com/cover.jpg', 'https://example.com/cover-2.jpg'],
        variants: {
          colorMeta: {
            Red: {
              images: ['https://example.com/red-1.jpg', 'https://example.com/red-2.jpg'],
              hot: false,
            },
          },
        },
      },
      upload: mockUpload,
    });

    expect(payload.skus).toHaveLength(1);
    expect(payload.skus?.[0]?.image).toBe('https://example.com/cover.jpg');
    expect(payload.mainImages).toEqual([
      'https://example.com/cover.jpg',
      'https://example.com/cover-2.jpg',
    ]);
  });

  it('leaves the size-only SKU image unset when no main image exists', async () => {
    const payload = await buildProductPayload({
      fields: sizeFields,
      status: 'draft',
      values: {
        name: 'Size Only Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Size: ['M'],
        'sku.default.price': '1500',
        'sku.default.stock': '3',
        mainImage: [],
      },
      upload: mockUpload,
    });

    expect(payload.mainImages).toEqual([]);
    expect(payload.skus?.[0]?.image).toBeUndefined();
  });

  it('gives the single-color SKU row the first color gallery head when there is no main image', async () => {
    // fix: the per-color branch of `buildPayloadSkus` fell back to raw
    // `mainImages` instead of the cover list, so the color branch and the SKU
    // branch read two different sources. Here `mainImages` is empty and the
    // cover came from the color gallery, so only the cover list can answer.
    const payload = await buildProductPayload({
      fields: colorFields,
      status: 'draft',
      values: {
        name: 'Solid Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        'sku.default.price': '1500',
        'sku.default.stock': '4',
        'sku.variants.Color.Red.price': '1500',
        'sku.variants.Color.Red.stock': '4',
        mainImage: [],
        variants: {
          colorMeta: { Red: { images: ['https://example.com/red-1.jpg'], hot: false } },
        },
      },
      upload: mockUpload,
    });

    expect(payload.mainImages).toEqual(['https://example.com/red-1.jpg']);
    expect(payload.skus?.[0]?.image).toBe('https://example.com/red-1.jpg');
  });

  it('leaves the single-color SKU image unset when no main image and an empty color gallery exist', async () => {
    // The degenerate end of the same rule: with nothing to derive a cover from
    // anywhere, the per-SKU image stays unset rather than reaching for a source
    // the payload never had.
    const payload = await buildProductPayload({
      fields: colorFields,
      status: 'draft',
      values: {
        name: 'Solid Tee',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        'sku.default.price': '1500',
        'sku.default.stock': '4',
        'sku.variants.Color.Red.price': '1500',
        'sku.variants.Color.Red.stock': '4',
        mainImage: [],
        variants: { colorMeta: { Red: { images: [], hot: false } } },
      },
      upload: mockUpload,
    });

    expect(payload.mainImages).toEqual([]);
    expect(payload.colorVariants?.[0]?.images).toEqual([]);
    expect(payload.skus?.[0]?.image).toBeUndefined();
  });
});
