import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import { isGalleryFilled, sanitizeVariantKey } from '../add-product-helpers';
import { buildProductPayload, pruneOrphanVariantPaths } from '../add-product-payload';
import { buildSidebarSections, collectPricingErrors } from '../add-product-validation';

const variantFields: FieldSpec[] = [
  { name: 'Color', uiType: 'multiselect', label: 'Color', group: 'variant' },
  { name: 'Size', uiType: 'multiselect', label: 'Size', group: 'variant' },
];

const baseArgs = {
  fields: variantFields,
  variantMeta: [
    { key: 'Color', label: 'Color' },
    { key: 'Size', label: 'Size' },
  ],
};

describe('sanitizeVariantKey', () => {
  it('encodes dots and brackets so dot-path lookups stay unambiguous', () => {
    expect(sanitizeVariantKey('28.5')).toBe('28_5');
    expect(sanitizeVariantKey('6 [slim]')).toBe('6 (slim)');
    expect(sanitizeVariantKey('Red')).toBe('Red');
  });
});

describe('isGalleryFilled', () => {
  it('treats only non-empty arrays as filled', () => {
    expect(isGalleryFilled([])).toBe(false);
    expect(isGalleryFilled(undefined)).toBe(false);
    expect(isGalleryFilled('x')).toBe(false);
    expect(isGalleryFilled(['a'])).toBe(true);
  });
});

describe('pruneOrphanVariantPaths', () => {
  const axes = [
    { key: 'Color', values: ['Red'] },
    { key: 'Size', values: ['S'] },
  ];
  it('drops deselected-axis leaves and keeps everything else', () => {
    const flat = {
      'sku.variants.Color.Red.Size.S.price': '100',
      'sku.variants.Color.Blue.Size.S.price': '100',
      'sku.variants.Color.Red.Size.M.price': '100',
      'sku.default.stock': '5',
      name: 'Shirt',
    };
    const pruned = pruneOrphanVariantPaths(flat, axes);
    expect(pruned['sku.variants.Color.Red.Size.S.price']).toBe('100');
    expect(pruned['sku.variants.Color.Blue.Size.S.price']).toBeUndefined();
    expect(pruned['sku.variants.Color.Red.Size.M.price']).toBeUndefined();
    expect(pruned['sku.default.stock']).toBe('5');
    expect(pruned.name).toBe('Shirt');
  });

  it('returns input untouched when no axis carries values', () => {
    const flat = { 'sku.variants.Color.Red.Size.S.price': '100' };
    expect(pruneOrphanVariantPaths(flat, [])).toBe(flat);
  });
});

describe('collectPricingErrors', () => {
  it('reads prices written under sanitized keys for dotted variant values', () => {
    const errors = collectPricingErrors({
      ...baseArgs,
      values: {
        Color: ['Red'],
        Size: ['28.5'],
        sku: {
          variants: {
            Color: { Red: { Size: { '28_5': { price: '1200', stock: '10' } } } },
          },
        },
      },
    });
    expect(errors).toEqual([]);
  });

  it('still flags truly missing prices on dotted rows', () => {
    const errors = collectPricingErrors({
      ...baseArgs,
      values: {
        Color: ['Red'],
        Size: ['28.5'],
        sku: { variants: {} },
      },
    });
    expect(errors.some((message) => message.includes('28.5'))).toBe(true);
  });

  it('names every group when more than two variant axes carry values', () => {
    const errors = collectPricingErrors({
      fields: variantFields,
      values: { Color: ['Red'], Size: ['S'], Length: ['Short'] },
      variantMeta: [
        { key: 'Color', label: 'Color' },
        { key: 'Size', label: 'Size' },
        { key: 'Length', label: 'Length' },
      ],
    });
    const message = errors.find((entry) => entry.includes('two variant groups')) ?? '';
    expect(message).toContain('Color');
    expect(message).toContain('Size');
    expect(message).toContain('Length');
  });
});

describe('buildProductPayload update mode', () => {
  const mockUpload = vi.fn().mockImplementation(async (files: unknown[]) => {
    return files.map((f, i) =>
      typeof f === 'string' ? f : `https://cdn.example.com/uploaded-${i}.jpg`,
    );
  });
  const fields: FieldSpec[] = [
    { name: 'name', uiType: 'input', label: 'Product Name', group: 'base', required: true },
    { name: 'Color', uiType: 'multiselect', label: 'Available Colors', group: 'variant' },
    { name: 'Size', uiType: 'multiselect', label: 'Available Sizes', group: 'variant' },
  ];

  it('keeps an emptied gallery empty on update instead of resurrecting mains', async () => {
    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values: {
        name: 'Test Product That Has A Long Enough Name For Validation',
        brand: 'Test',
        description: 'd',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        Size: ['S'],
        mainImages: ['https://cdn.example.com/cover.jpg'],
        'variants.colorMeta.Red.images': [],
        'sku.variants.Color.Red.Size.S.price': '1200',
        'sku.variants.Color.Red.Size.S.stock': '5',
      },
      upload: mockUpload,
      isUpdate: true,
    });
    const variants = payload.colorVariants as Array<{ images?: string[] }>;
    expect(variants[0].images).toEqual([]);
  });

  it('leaves a cleared cover cleared on update', async () => {
    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values: {
        name: 'Test Product That Has A Long Enough Name For Validation',
        brand: 'Test',
        description: 'd',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        Size: ['S'],
        mainImages: [],
        'variants.colorMeta.Red.images': ['https://cdn.example.com/g1.jpg'],
        'sku.variants.Color.Red.Size.S.price': '1200',
        'sku.variants.Color.Red.Size.S.stock': '5',
      },
      upload: mockUpload,
      isUpdate: true,
    });
    expect(payload.mainImages).toEqual([]);
  });

  it('still auto-derives the cover on create', async () => {
    const payload = await buildProductPayload({
      fields,
      status: 'draft',
      values: {
        name: 'Test Product That Has A Long Enough Name For Validation',
        brand: 'Test',
        description: 'd',
        categoryId: 'cat-1',
        subcategoryId: 'subcat-1',
        Color: ['Red'],
        Size: ['S'],
        mainImages: [],
        'variants.colorMeta.Red.images': ['https://cdn.example.com/g1.jpg'],
        'sku.variants.Color.Red.Size.S.price': '1200',
        'sku.variants.Color.Red.Size.S.stock': '5',
      },
      upload: mockUpload,
    });
    expect(payload.mainImages).toEqual(['https://cdn.example.com/g1.jpg']);
  });
});

describe('buildSidebarSections pricing anchor', () => {
  it('keeps the pricing section failing while the axis overflow is unresolved', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: variantFields,
      schemaHasName: true,
      values: { Color: ['Red'], Size: ['S'], Length: ['Short'] },
      variantMeta: [
        { key: 'Color', label: 'Color' },
        { key: 'Size', label: 'Size' },
        { key: 'Length', label: 'Length' },
      ],
    });
    const pricing = sections.find((section) => section.key === 'pricing');
    expect(pricing?.status).toBe(false);
    expect(pricing?.errors.some((message) => message.includes('two variant groups'))).toBe(true);
  });
});
