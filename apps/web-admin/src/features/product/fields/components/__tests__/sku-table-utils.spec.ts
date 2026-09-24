import { describe, expect, it } from 'vitest';

import type { VariantSelection } from '../sku-table-types';
import {
  buildScopeOptions,
  collectSkuPaths,
  getSkuButtonState,
  matchesScope,
} from '../sku-table-utils';

describe('SKU Table Batch Edit Scope Utilities', () => {
  const variants: VariantSelection[] = [
    {
      key: 'color',
      label: 'Color',
      values: ['red', 'blue'],
    },
    {
      key: 'size',
      label: 'Size',
      values: ['S', 'M', 'L'],
    },
  ];

  const labelOf = (axisKey: string, value: string) => {
    if (axisKey === 'color') return value === 'red' ? 'Red' : 'Blue';
    return value;
  };

  describe('buildScopeOptions', () => {
    it('generates All Variants, per-color all sizes, per-size all colors, and individual item options', () => {
      const options = buildScopeOptions(variants, labelOf);

      // 1. All Variants
      expect(options[0]).toEqual({ value: 'ALL', label: 'All Variants' });

      // 2. Per-color all sizes options
      expect(options).toContainEqual({
        value: 'color::red',
        label: 'Color: Red (All Sizes)',
      });
      expect(options).toContainEqual({
        value: 'color::blue',
        label: 'Color: Blue (All Sizes)',
      });

      // 3. Per-size all colors options
      expect(options).toContainEqual({
        value: 'size::S',
        label: 'Size: S (All Colors)',
      });
      expect(options).toContainEqual({
        value: 'size::M',
        label: 'Size: M (All Colors)',
      });
      expect(options).toContainEqual({
        value: 'size::L',
        label: 'Size: L (All Colors)',
      });

      // 4. Individual combinations
      expect(options).toContainEqual({
        value: 'color::red||size::S',
        label: 'Red × S',
      });
      expect(options).toContainEqual({
        value: 'color::blue||size::L',
        label: 'Blue × L',
      });
    });
  });

  describe('matchesScope', () => {
    it('matches ALL variants when scope is ALL', () => {
      expect(matchesScope('ALL', 'color', 'red', 'size', 'S')).toBe(true);
      expect(matchesScope('ALL', 'color', 'blue', 'size', 'M')).toBe(true);
    });

    it('matches all sizes for a given color when scope is per-color', () => {
      const redScope = 'color::red';
      expect(matchesScope(redScope, 'color', 'red', 'size', 'S')).toBe(true);
      expect(matchesScope(redScope, 'color', 'red', 'size', 'M')).toBe(true);
      expect(matchesScope(redScope, 'color', 'red', 'size', 'L')).toBe(true);

      // Should not match blue
      expect(matchesScope(redScope, 'color', 'blue', 'size', 'S')).toBe(false);
    });

    it('matches all colors for a given size when scope is per-size', () => {
      const mediumScope = 'size::M';
      expect(matchesScope(mediumScope, 'color', 'red', 'size', 'M')).toBe(true);
      expect(matchesScope(mediumScope, 'color', 'blue', 'size', 'M')).toBe(true);

      // Should not match other sizes
      expect(matchesScope(mediumScope, 'color', 'red', 'size', 'S')).toBe(false);
      expect(matchesScope(mediumScope, 'color', 'blue', 'size', 'L')).toBe(false);
    });

    it('matches only the exact item when scope is an individual combination', () => {
      const exactScope = 'color::red||size::M';
      expect(matchesScope(exactScope, 'color', 'red', 'size', 'M')).toBe(true);
      expect(matchesScope(exactScope, 'color', 'red', 'size', 'S')).toBe(false);
      expect(matchesScope(exactScope, 'color', 'blue', 'size', 'M')).toBe(false);
    });
  });

  describe('collectSkuPaths', () => {
    it('returns default SKU path when no variants exist', () => {
      expect(collectSkuPaths([])).toEqual(['sku.default.sellerSku']);
    });

    it('returns paths for single variant axis', () => {
      const singleAxis: VariantSelection[] = [{ key: 'size', label: 'Size', values: ['S', 'M'] }];
      expect(collectSkuPaths(singleAxis)).toEqual([
        'sku.variants.size.S.sellerSku',
        'sku.variants.size.M.sellerSku',
      ]);
    });

    it('returns cross-product paths for multi-axis variants', () => {
      const paths = collectSkuPaths(variants);
      expect(paths).toHaveLength(6);
      expect(paths).toContain('sku.variants.color.red.size.S.sellerSku');
      expect(paths).toContain('sku.variants.color.blue.size.L.sellerSku');
    });
  });

  describe('getSkuButtonState', () => {
    it('returns disabled check state when all SKUs are already assigned', () => {
      const state = getSkuButtonState(6, 0);
      expect(state.label).toBe('All SKUs Assigned');
      expect(state.isDisabled).toBe(true);
      expect(state.icon).toBe('check');
    });

    it('returns auto-generate state when no SKUs have been assigned yet', () => {
      const state = getSkuButtonState(6, 6);
      expect(state.label).toBe('Auto-Generate SKUs');
      expect(state.isDisabled).toBe(false);
      expect(state.icon).toBe('sparkles');
    });

    it('returns count of missing SKUs when only a subset is unassigned', () => {
      const state = getSkuButtonState(6, 2);
      expect(state.label).toBe('Generate Missing (2)');
      expect(state.isDisabled).toBe(false);
      expect(state.icon).toBe('sparkles');
    });
  });
});
