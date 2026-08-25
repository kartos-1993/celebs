import { describe, expect,it } from 'vitest';

import type { ProductQueueItem } from '../../components/review-queue/types';
import { extractHexColor,isHexColor, isMulticolorVariant, resolveColorCode } from '../add-product-helpers';
import { formatProductCategoryBreadcrumb } from '../category-format';

describe('Color Resolver & Category Breadcrumb Formatting', () => {
  describe('isHexColor & extractHexColor', () => {
    it('should validate hex colors accurately', () => {
      expect(isHexColor('#FFF')).toBe(true);
      expect(isHexColor('#123456')).toBe(true);
      expect(isHexColor('blue')).toBe(false);
    });

    it('should extract hex codes from option set strings', () => {
      expect(extractHexColor('Red (#EF4444)')).toBe('#EF4444');
      expect(extractHexColor('#000080')).toBe('#000080');
      expect(extractHexColor('Multicolor')).toBeUndefined();
    });
  });

  describe('resolveColorCode', () => {
    it('should extract and keep valid hex colors', () => {
      expect(resolveColorCode('#EF4444')).toBe('#EF4444');
      expect(resolveColorCode('Blue (#0000FF)')).toBe('#0000FF');
      expect(resolveColorCode('#000')).toBe('#000');
    });

    it('should preserve raw color name when no hex is provided', () => {
      expect(resolveColorCode('Navy Blue')).toBe('Navy Blue');
      expect(resolveColorCode('Multicolor')).toBe('Multicolor');
    });

    it('should fallback cleanly when empty', () => {
      expect(resolveColorCode('')).toBe('#000000');
      expect(resolveColorCode(undefined)).toBe('#000000');
    });
  });

  describe('isMulticolorVariant', () => {
    it('should detect multicolor, rainbow, floral, tie-dye, and patterns', () => {
      expect(isMulticolorVariant('Multicolor')).toBe(true);
      expect(isMulticolorVariant('Pastel Rainbow')).toBe(true);
      expect(isMulticolorVariant('Floral Print')).toBe(true);
      expect(isMulticolorVariant('Tie-Dye Swirl')).toBe(true);
      expect(isMulticolorVariant('Red & White Stripe')).toBe(true);
      expect(isMulticolorVariant('Plaid Blue')).toBe(true);
    });

    it('should return false for single solid colors', () => {
      expect(isMulticolorVariant('Solid Navy')).toBe(false);
      expect(isMulticolorVariant('Black')).toBe(false);
      expect(isMulticolorVariant('#3B82F6')).toBe(false);
      expect(isMulticolorVariant('')).toBe(false);
    });
  });

  describe('formatProductCategoryBreadcrumb', () => {
    it('should format Category > Subcategory when both objects exist', () => {
      const product: Partial<ProductQueueItem> = {
        category: { id: 'cat-1', name: 'Apparel', slug: 'apparel', path: 'apparel' },
        subcategory: { id: 'cat-2', name: 'Denim Jackets', slug: 'denim-jackets', path: 'apparel/denim-jackets' },
      };
      expect(formatProductCategoryBreadcrumb(product as ProductQueueItem)).toBe('Apparel > Denim Jackets');
    });

    it('should not display duplicate names if category and subcategory are identical', () => {
      const product: Partial<ProductQueueItem> = {
        category: { id: 'cat-1', name: 'Apparel' },
        subcategory: { id: 'cat-1', name: 'Apparel' },
      };
      expect(formatProductCategoryBreadcrumb(product as ProductQueueItem)).toBe('Apparel');
    });

    it('should never display raw UUIDs or ObjectIds in breadcrumb', () => {
      const product: Partial<ProductQueueItem> = {
        category: '6a4f4c5412b44bc4d15b5633',
        subcategory: '6a4f4c5412b44bc4d15b5633',
      };
      expect(formatProductCategoryBreadcrumb(product as ProductQueueItem)).toBe('Uncategorized');
    });

    it('should parse path string when available', () => {
      const product: Partial<ProductQueueItem> = {
        category: { id: 'c1', name: '', path: 'men/clothing/jackets' },
      };
      expect(formatProductCategoryBreadcrumb(product as ProductQueueItem)).toBe('men > clothing > jackets');
    });
  });
});
