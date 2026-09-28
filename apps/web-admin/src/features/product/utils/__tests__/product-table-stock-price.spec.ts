import { describe, expect, it } from 'vitest';

import type { AdminProductListItem } from '@celebs/shared-types';

import type { PreviewFilters } from '../../types';
import {
  applyPreviewFilters,
  avgStock,
  getProductPrice,
  getProductStock,
  getStockState,
} from '../product-table-helpers';

const item = (over: Partial<AdminProductListItem>): AdminProductListItem =>
  ({ id: 'p1', name: 'Kurta', ...over }) as AdminProductListItem;

describe('missing stock is missing, not zero', () => {
  it('carries an absent stockTotal through as null instead of coercing it', () => {
    // `return product.stockTotal` handed `undefined` on to `getStockState`, and
    // `undefined <= 0` is false — so a product with NO stock was badged "in
    // stock". A seller cannot act on a badge that lies about their own listing.
    expect(getProductStock(item({}))).toBeNull();
    expect(getStockState(getProductStock(item({})))).toBe('out');
  });

  it('keeps a real zero as zero', () => {
    expect(getProductStock(item({ stockTotal: 0 }))).toBe(0);
    expect(getStockState(0)).toBe('out');
  });

  it('classifies low and in stock off the real total', () => {
    expect(getStockState(4)).toBe('low');
    expect(getStockState(40)).toBe('in');
  });

  it('averages only over the rows that reported a total, never NaN', () => {
    expect(avgStock([])).toBeNull();
    expect(avgStock([item({ stockTotal: 10 }), item({})])).toBe(10);
    expect(avgStock([item({ stockTotal: 10 }), item({ stockTotal: 21 })])).toBe(15.5);
    expect(avgStock([item({}), item({})])).toBeNull();
  });

  it('files an unstocked product under the "out" preview filter, not "in"', () => {
    const products = [item({ id: 'a', stockTotal: 40 }), item({ id: 'b' })];
    const filters = { vendor: 'all', category: 'all', stock: 'in' } as PreviewFilters;
    expect(applyPreviewFilters(products, filters).map((p) => p.id)).toEqual(['a']);
    expect(applyPreviewFilters(products, { ...filters, stock: 'out' }).map((p) => p.id)).toEqual([
      'b',
    ]);
  });
});

describe('a missing price is an empty state, not Rs. 0', () => {
  it('returns null for a product with no price', () => {
    expect(getProductPrice(item({}))).toBeNull();
  });

  it('returns the number for a product that has one', () => {
    expect(getProductPrice(item({ price: 2400 }))).toBe(2400);
    expect(getProductPrice(item({ price: 0 }))).toBe(0);
  });
});
