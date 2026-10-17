import { describe, expect, it } from 'vitest';

import { buildVariantKey, isPlaceholderVariant, PRODUCT_CARRIER_VARIANT } from '../variant-helpers';

describe('Variant Helpers', () => {
  describe('PRODUCT_CARRIER_VARIANT', () => {
    it('is the size-only carrier name and is treated as a placeholder, not a colour', () => {
      expect(PRODUCT_CARRIER_VARIANT).toBe('Default');
      expect(isPlaceholderVariant(PRODUCT_CARRIER_VARIANT)).toBe(true);
      expect(isPlaceholderVariant(PRODUCT_CARRIER_VARIANT.toLowerCase())).toBe(true);
    });

    it('is stripped by buildVariantKey so carrier rows bind to size-only SKUs', () => {
      expect(buildVariantKey([PRODUCT_CARRIER_VARIANT, 'M'])).toBe('m');
      expect(buildVariantKey([PRODUCT_CARRIER_VARIANT, PRODUCT_CARRIER_VARIANT])).toBe('');
    });
  });

  describe('isPlaceholderVariant', () => {
    it('identifies null, undefined, and empty string as placeholder', () => {
      expect(isPlaceholderVariant(null)).toBe(true);
      expect(isPlaceholderVariant(undefined)).toBe(true);
      expect(isPlaceholderVariant('')).toBe(true);
      expect(isPlaceholderVariant('   ')).toBe(true);
    });

    it('identifies case-insensitive default as placeholder', () => {
      expect(isPlaceholderVariant('default')).toBe(true);
      expect(isPlaceholderVariant('Default')).toBe(true);
      expect(isPlaceholderVariant('DEFAULT')).toBe(true);
      expect(isPlaceholderVariant('  default  ')).toBe(true);
    });

    it('identifies legitimate variant names as non-placeholder', () => {
      expect(isPlaceholderVariant('Red')).toBe(false);
      expect(isPlaceholderVariant('XL')).toBe(false);
      expect(isPlaceholderVariant('Navy Blue')).toBe(false);
    });
  });

  describe('buildVariantKey', () => {
    it('normalizes, filters dummy placeholders, and sorts options into a canonical key', () => {
      expect(buildVariantKey(['Red', 'M'])).toBe('m:::red');
      expect(buildVariantKey(['M', 'Red'])).toBe('m:::red');
      expect(buildVariantKey(['Red', 'Default'])).toBe('red');
      expect(buildVariantKey(['Default', 'default'])).toBe('');
      expect(buildVariantKey(['  Blue  ', '  XL  '])).toBe('blue:::xl');
    });
  });
});
