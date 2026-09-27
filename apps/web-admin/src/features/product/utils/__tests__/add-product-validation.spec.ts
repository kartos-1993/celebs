import { describe, expect, it, vi } from 'vitest';

import type { FieldSpec } from '../../types';
import { isGalleryFilled, sanitizeVariantKey } from '../add-product-helpers';
import { buildProductPayload, pruneOrphanVariantPaths } from '../add-product-payload';
import {
  buildSidebarSections,
  collectPricingErrors,
  collectShippingErrors,
} from '../add-product-validation';

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

  it('drops stale variant paths when no axis carries values', () => {
    const flat = { 'sku.variants.Color.Red.Size.S.price': '100' };
    const out = pruneOrphanVariantPaths(flat, []);
    expect(out).not.toBe(flat);
    expect(out['sku.variants.Color.Red.Size.S.price']).toBeUndefined();
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
            Color: {
              Red: { Size: { '28_5': { price: '1200', stock: '10', sellerSku: 'CLB-RED-28_5' } } },
            },
          },
        },
      },
    });
    expect(errors).toEqual([]);
  });

  it('flags missing SKU code on variant rows', () => {
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
    expect(errors).toContain('Color: Red, Size: 28.5: SKU code is required.');
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

describe('shipping and warranty validation and score calculation', () => {
  it('accepts a blank package weight because the server defaults it to 0.3', () => {
    expect(collectShippingErrors({ values: {} })).toEqual([]);
  });

  it('rejects an explicit non-positive package weight', () => {
    expect(collectShippingErrors({ values: { packageWeightKg: 0 } })).toEqual([
      'Package weight must be greater than 0 kg (leave blank to use the 0.3 kg default).',
    ]);
  });

  it('identifies invalid warranty details when warranty type is set without specifying duration', () => {
    const errors = collectShippingErrors({
      values: { packageWeightKg: 0.5, warrantyType: 'BRAND_WARRANTY', warrantyPeriod: '' },
    });
    expect(errors).toContain('Specify warranty duration when warranty is offered.');
  });

  it('returns no errors when valid physical weight and warranty terms are provided', () => {
    const errors = collectShippingErrors({
      values: {
        packageWeightKg: 0.75,
        packageLengthCm: 30,
        packageWidthCm: 20,
        packageHeightCm: 5,
        warrantyType: 'NO_WARRANTY',
      },
    });
    expect(errors).toHaveLength(0);
  });

  it('keeps the shipping section complete on a blank form (server-defaulted weight)', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: variantFields,
      schemaHasName: true,
      values: {},
      variantMeta: [],
    });
    const shippingSection = sections.find((section) => section.key === 'shipping');
    expect(shippingSection).toBeDefined();
    expect(shippingSection?.status).toBe(true);
    expect(shippingSection?.errors).toHaveLength(0);
  });

  it('marks shipping and warranty section complete when required data is populated', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: variantFields,
      schemaHasName: true,
      values: {
        packageWeightKg: 0.35,
        warrantyType: 'NO_WARRANTY',
      },
      variantMeta: [],
    });
    const shippingSection = sections.find((section) => section.key === 'shipping');
    expect(shippingSection).toBeDefined();
    expect(shippingSection?.status).toBe(true);
    expect(shippingSection?.errors).toHaveLength(0);
  });
});

describe('buildSidebarSections specification attributes threshold', () => {
  const specFields: FieldSpec[] = [
    { name: 'Fabric', uiType: 'input', label: 'Fabric', group: 'details' },
    { name: 'Occasion', uiType: 'input', label: 'Occasion', group: 'details' },
    { name: 'FitType', uiType: 'input', label: 'Fit Type', group: 'details' },
    { name: 'Collar', uiType: 'input', label: 'Collar Style', group: 'details' },
  ];

  it('marks specification section invalid when fewer than 3 attributes are populated', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: specFields,
      schemaHasName: true,
      values: { Fabric: 'Pure Cotton', Occasion: 'Casual' },
      variantMeta: [],
    });
    const specs = sections.find((section) => section.key === 'specification');
    expect(specs?.status).toBe(false);
    expect(specs?.errors[0]).toBe('Fill at least 3 specification attributes (currently 2 filled).');
  });

  it('marks specification section complete once at least 3 attributes are populated', () => {
    const sections = buildSidebarSections({
      fieldErrors: [],
      schemaFields: specFields,
      schemaHasName: true,
      values: { Fabric: 'Pure Cotton', Occasion: 'Casual', FitType: 'Regular Fit' },
      variantMeta: [],
    });
    const specs = sections.find((section) => section.key === 'specification');
    expect(specs?.status).toBe(true);
    expect(specs?.errors).toHaveLength(0);
  });
});
