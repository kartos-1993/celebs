import { describe, expect, it } from 'vitest';

import type { FieldSpec } from '../../types';
import { sanitizeVariantKey } from '../add-product-helpers';
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
