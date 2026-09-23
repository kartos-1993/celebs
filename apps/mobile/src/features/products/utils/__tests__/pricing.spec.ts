import { describe, expect, it } from 'vitest';

import type { Product } from '../../hooks/use-products';
import { resolveMinPrice, resolveVariantPrice } from '../pricing';

const product: Product = {
  id: 'p1',
  name: 'Denim Shorts',
  price: 1500,
  discountedPrice: 1200,
  mainImages: [],
  status: 'published',
  skus: [
    { skuCode: 'A', selectedOptions: { Color: 'Red', Size: 'S' }, price: 1500 },
    {
      skuCode: 'B',
      selectedOptions: { Color: 'Blue', Size: 'M' },
      price: 1700,
      discountedPrice: 1400,
    },
    {
      skuCode: 'C',
      selectedOptions: { Color: 'Blue', Size: 'L' },
      price: 1700,
      discountedPrice: 1900,
    },
  ],
};

describe('resolveVariantPrice', () => {
  it('resolves the exact color+size combination', () => {
    expect(resolveVariantPrice(product, 'Blue', 'M')).toEqual({
      price: 1700,
      discountedPrice: 1400,
      source: 'sku',
    });
  });

  it('matches case-insensitively', () => {
    expect(resolveVariantPrice(product, 'blue', 'm').source).toBe('sku');
  });

  it('rejects an invalid discount and keeps the list price', () => {
    expect(resolveVariantPrice(product, 'Blue', 'L')).toEqual({
      price: 1700,
      discountedPrice: undefined,
      source: 'sku',
    });
  });

  it('falls back to the product base figure with no match', () => {
    expect(resolveVariantPrice(product, 'Green', 'XL')).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
    });
  });

  it('falls back to base when the product carries no skus', () => {
    expect(resolveVariantPrice({ ...product, skus: undefined }, 'Red', 'S')).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
    });
  });
});

describe('resolveMinPrice', () => {
  it('picks the minimum effective figure across skus', () => {
    expect(resolveMinPrice(product)).toEqual({
      price: 1700,
      discountedPrice: 1400,
      source: 'sku',
    });
  });

  it('falls back to base with no skus', () => {
    expect(resolveMinPrice({ ...product, skus: [] })).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
    });
  });
});
