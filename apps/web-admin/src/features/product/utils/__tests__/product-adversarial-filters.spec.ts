import { describe, expect, it } from 'vitest';

import { PLATFORM_VENDOR_ID, PLATFORM_VENDOR_NAME } from '@celebs/shared-types';

import {
  formatCategoryOptions,
  formatVendorOptions,
  getStockState,
} from '../product-table-helpers';

describe('Web-Admin Product Filtering Adversarial and Boundary Scenarios', () => {
  describe('formatVendorOptions robustness against corrupted and missing inputs', () => {
    it('always preserves the 1P Platform vendor even when vendor list is null or undefined', () => {
      const optionsFromNull = formatVendorOptions(null, []);
      expect(optionsFromNull).toEqual([{ id: PLATFORM_VENDOR_ID, label: PLATFORM_VENDOR_NAME }]);

      const optionsFromUndefined = formatVendorOptions(undefined, []);
      expect(optionsFromUndefined).toEqual([
        { id: PLATFORM_VENDOR_ID, label: PLATFORM_VENDOR_NAME },
      ]);
    });

    it('filters out null, empty-id, or corrupted vendor records without throwing exceptions', () => {
      const corruptedVendors = [
        null as unknown as { id: string },
        undefined as unknown as { id: string },
        { id: '', shopName: 'Blank ID Store' },
        { id: 'valid-v1', shopName: 'Valid Store 1' },
        { id: 'valid-v2', shopName: '' }, // empty shop name falls back to id
      ];

      const options = formatVendorOptions(corruptedVendors, []);
      expect(options).toEqual([
        { id: PLATFORM_VENDOR_ID, label: PLATFORM_VENDOR_NAME },
        { id: 'valid-v1', label: 'Valid Store 1' },
        { id: 'valid-v2', label: 'valid-v2' },
      ]);
    });

    it('deduplicates identical vendor IDs occurring in both vendors API and fallback products', () => {
      const apiVendors = [{ id: 'v-shared', shopName: 'Shared Vendor' }];
      const fallbackProducts = [
        { vendorName: 'Shared Vendor' } as never,
        { vendorName: 'Unique Fallback' } as never,
      ];

      const options = formatVendorOptions(apiVendors, fallbackProducts);
      const ids = options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain('v-shared');
      expect(ids).toContain('Unique Fallback');
    });
  });

  describe('formatCategoryOptions robustness with missing and nested data', () => {
    it('returns empty list safely without throwing when category tree is null or undefined', () => {
      expect(formatCategoryOptions(null, [])).toEqual([]);
      expect(formatCategoryOptions(undefined, [])).toEqual([]);
    });

    it('handles categories with missing children or null values gracefully', () => {
      const malformedTree = [
        null as unknown as { id: string; name: string },
        { id: 'cat-1', name: 'Clothing', children: undefined },
        {
          id: 'cat-2',
          name: 'Shoes',
          children: [
            null as unknown as { id: string; name: string },
            { id: 'cat-2-1', name: 'Sneakers' },
          ],
        },
      ];

      const options = formatCategoryOptions(malformedTree, []);
      expect(options).toEqual([
        { id: 'cat-1', label: 'Clothing' },
        { id: 'cat-2', label: 'Shoes' },
        { id: 'cat-2-1', label: 'Shoes > Sneakers' },
      ]);
    });
  });

  describe('getStockState boundaries', () => {
    it('classifies null or negative stock counts strictly as out of stock', () => {
      expect(getStockState(null)).toBe('out');
      expect(getStockState(0)).toBe('out');
      expect(getStockState(-10)).toBe('out');
      expect(getStockState(-0.01)).toBe('out');
    });

    it('classifies stock counts between 1 and 9 as low stock', () => {
      expect(getStockState(1)).toBe('low');
      expect(getStockState(5)).toBe('low');
      expect(getStockState(9)).toBe('low');
    });

    it('classifies stock counts 10 or greater as in stock', () => {
      expect(getStockState(10)).toBe('in');
      expect(getStockState(100)).toBe('in');
      expect(getStockState(50000)).toBe('in');
    });
  });
});
