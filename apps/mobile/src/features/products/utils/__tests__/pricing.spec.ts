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
  minPrice: 1400,
  minDiscounted: 1400,
  comboPrices: [
    { options: { Color: 'Red', Size: 'S' }, price: 1500, stock: 3 },
    { options: { Color: 'Blue', Size: 'M' }, price: 1700, discountedPrice: 1400, stock: 5 },
    { options: { Color: 'Blue', Size: 'L' }, price: 1700, discountedPrice: 1900, stock: 2 },
  ],
};

describe('resolveVariantPrice', () => {
  it('resolves the exact color+size combination', () => {
    expect(resolveVariantPrice(product, 'Blue', 'M')).toEqual({
      price: 1700,
      discountedPrice: 1400,
      source: 'combo',
    });
  });

  it('matches case-insensitively', () => {
    expect(resolveVariantPrice(product, 'blue', 'm').source).toBe('combo');
  });

  it('rejects an invalid discount and keeps the list price', () => {
    expect(resolveVariantPrice(product, 'Blue', 'L')).toEqual({
      price: 1700,
      discountedPrice: undefined,
      source: 'combo',
    });
  });

  it('falls back to the product base figure with no match', () => {
    expect(resolveVariantPrice(product, 'Green', 'XL')).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
    });
  });

  it('falls back to base when the product declares no combos', () => {
    expect(resolveVariantPrice({ ...product, comboPrices: undefined }, 'Red', 'S')).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
    });
  });
});

describe('resolveMinPrice', () => {
  it('renders the backend-declared minimum', () => {
    expect(resolveMinPrice(product)).toEqual({
      price: 1400,
      discountedPrice: 1400,
      source: 'combo',
    });
  });

  it('falls back to base with no declared minimum', () => {
    const { minPrice: _minPrice, minDiscounted: _minDiscounted, ...rest } = product;
    expect(resolveMinPrice(rest)).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
    });
  });
});
