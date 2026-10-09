import { describe, expect, it } from 'vitest';

import { formatProductResponse } from '../product-format';
import { formatAdminProductListItem } from '../product-response-shapes';

import { baseRow } from './presenter-fixtures';

describe('Product Live Stock Derivation Integration', () => {
  it('evaluates inStock as true for simple product with live PostgreSQL inventory', () => {
    // Simple product with no color variants or skus, but inventory rows in PostgreSQL
    const row = baseRow({
      colorVariants: [],
      skus: [],
      inventories: [
        {
          colorVariantName: 'Default',
          size: 'Standard',
          quantity: 15,
          reservedQuantity: 0,
        },
      ],
    });

    const formatted = formatProductResponse(row);
    expect(formatted).not.toBeNull();
    // Must be in stock because available quantity (15 - 0) > 0
    expect(formatted?.inStock).toBe(true);
  });

  it('reports accurate stockTotal for colourless products in admin list item', () => {
    // Colourless product whose carrier variant was filtered out
    const row = baseRow({
      colorVariants: [
        {
          name: 'Default',
          stocks: [{ size: 'M', quantity: 15 }],
        },
      ],
      skus: [],
      inventories: [
        {
          colorVariantName: 'Default',
          size: 'M',
          quantity: 15,
          reservedQuantity: 0,
        },
      ],
    });

    const formatted = formatProductResponse(row);
    expect(formatted).not.toBeNull();
    // The carrier row is stripped from presentation colorVariants
    expect(formatted?.colorVariants).toEqual([]);

    // formatAdminProductListItem must still report the true stockTotal (15)
    const adminItem = formatAdminProductListItem(formatted!);
    expect(adminItem.stockTotal).toBe(15);
  });

  it('treats product as out of stock when all inventory is reserved', () => {
    const row = baseRow({
      colorVariants: [],
      skus: [],
      inventories: [
        {
          colorVariantName: 'Default',
          size: 'Standard',
          quantity: 10,
          reservedQuantity: 10,
        },
      ],
    });

    const formatted = formatProductResponse(row);
    expect(formatted).not.toBeNull();
    expect(formatted?.inStock).toBe(false);

    const adminItem = formatAdminProductListItem(formatted!);
    expect(adminItem.stockTotal).toBe(0);
  });

  it('matches inventory case-insensitively across variant name and size', () => {
    const row = baseRow({
      colorVariants: [
        {
          name: 'Navy Blue',
          stocks: [{ size: 'XL', quantity: 2 }],
        },
      ],
      inventories: [
        {
          colorVariantName: 'navy blue',
          size: 'xl',
          quantity: 25,
          reservedQuantity: 5,
        },
      ],
    });

    const formatted = formatProductResponse(row);
    expect(formatted).not.toBeNull();
    const variants = formatted?.colorVariants as Array<{
      stocks: Array<{ size: string; quantity: number }>;
    }>;
    expect(variants[0]?.stocks[0]?.quantity).toBe(20); // 25 - 5
    expect(formatted?.inStock).toBe(true);
  });

  it('handles corrupted sku entry with negative price or non-numeric stock', () => {
    const row = baseRow({
      skus: [
        {
          selectedOptions: { Color: 'Red' },
          price: -100,
          stock: 'invalid',
        },
        {
          selectedOptions: { Color: 'Blue' },
          price: 500,
          stock: 8,
        },
      ],
    });

    const formatted = formatProductResponse(row);
    expect(formatted).not.toBeNull();
    const adminItem = formatAdminProductListItem(formatted!);
    expect(adminItem.stockTotal).toBe(8);
  });
});
