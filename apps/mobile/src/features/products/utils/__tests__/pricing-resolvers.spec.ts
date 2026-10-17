import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { validDiscount } from '@celebs/shared-utils';

import type { Product } from '../../hooks/use-products';
import { resolveMinPrice, resolveVariantPrice } from '../pricing';

const PRICING_SRC = readFileSync(resolve(__dirname, '../pricing.ts'), 'utf8');
const CARD_HOOK_SRC = readFileSync(resolve(__dirname, '../../hooks/use-product-card.ts'), 'utf8');

const product: Product = {
  id: 'p1',
  name: 'Denim Shorts',
  price: 1500,
  discountedPrice: 1200,
  mainImages: [],
  status: 'published',
  minPrice: 1400,
  minDiscounted: 1100,
  comboPrices: [
    { options: { Color: 'Red', Size: 'S' }, price: 1500, stock: 3 },
    { options: { Color: 'Blue', Size: 'M' }, price: 1700, discountedPrice: 1400, stock: 5 },
    { options: { Color: 'Blue', Size: 'L' }, price: 1700, discountedPrice: 1900, stock: 2 },
  ],
};

describe('resolveVariantPrice — invalid-discount filtering', () => {
  it('keeps a valid combo discount', () => {
    expect(resolveVariantPrice(product, 'Blue', 'M')).toEqual({
      price: 1700,
      discountedPrice: 1400,
      source: 'combo',
      isRange: false,
    });
  });

  it('drops a combo discount priced above list', () => {
    expect(resolveVariantPrice(product, 'Blue', 'L')).toEqual({
      price: 1700,
      discountedPrice: undefined,
      source: 'combo',
      isRange: false,
    });
  });

  it('drops zero/negative combo discounts', () => {
    const zeroDeal: Product = {
      ...product,
      comboPrices: [{ options: { Color: 'Red', Size: 'S' }, price: 1500, discountedPrice: 0 }],
    };
    expect(resolveVariantPrice(zeroDeal, 'Red', 'S').discountedPrice).toBeUndefined();
    const negativeDeal: Product = {
      ...product,
      comboPrices: [{ options: { Color: 'Red', Size: 'S' }, price: 1500, discountedPrice: -50 }],
    };
    expect(resolveVariantPrice(negativeDeal, 'Red', 'S').discountedPrice).toBeUndefined();
  });

  it('validates the product-base discount too', () => {
    const badBase: Product = { ...product, comboPrices: [], discountedPrice: 1900 };
    expect(resolveVariantPrice(badBase, 'Green', 'XL')).toEqual({
      price: 1500,
      discountedPrice: undefined,
      source: 'product',
      isRange: false,
    });
  });

  it('falls back to base 0 for a missing price and never yields NaN', () => {
    expect(resolveVariantPrice(null, 'Red', 'S')).toEqual({
      price: 0,
      discountedPrice: undefined,
      source: 'product',
      isRange: false,
    });
  });

  it('survives a NULL API price without producing NaN', () => {
    const nullPriced = { ...product, price: null, minPrice: null } as unknown as Product;
    const resolved = resolveVariantPrice(nullPriced, 'Red', 'S');
    expect(Number.isFinite(resolved.price)).toBe(true);
    expect(Number.isFinite(resolveMinPrice(nullPriced).price)).toBe(true);
  });
});

describe('resolveVariantPrice — range when nothing is selected', () => {
  it('flags a no-size resolution as a range quoting the low end', () => {
    // Blue has M(list 1700 / deal 1400) and L(1700, deal rejected as above-list).
    // The winning entry is M, so the displayed low end is its 1400 deal — and
    // because the matches disagree, it must render as "from 1400", not 1400.
    const resolved = resolveVariantPrice(product, 'Blue');
    expect(resolved.isRange).toBe(true);
    expect(resolved.price).toBe(1700);
    expect(resolved.discountedPrice).toBe(1400);
    expect((resolved.discountedPrice ?? resolved.price) as number).toBeLessThan(product.price);
  });

  it('treats a placeholder size the same as no size', () => {
    expect(resolveVariantPrice(product, 'Blue', 'Default').isRange).toBe(true);
    expect(resolveVariantPrice(product, 'Blue', 'default').isRange).toBe(true);
  });

  it('a single matching size is NOT a range', () => {
    const single: Product = {
      ...product,
      comboPrices: [{ options: { Color: 'Red', Size: 'S' }, price: 1500 }],
    };
    expect(resolveVariantPrice(single, 'Red').isRange).toBe(false);
  });

  it('the base-price fallback is never a range', () => {
    expect(resolveVariantPrice(product, 'Green').isRange).toBe(false);
  });
});

describe('resolveMinPrice — backend minimum passthrough', () => {
  it('renders the backend-declared minimum', () => {
    expect(resolveMinPrice(product)).toEqual({
      price: 1400,
      discountedPrice: 1100,
      source: 'combo',
      isRange: false,
    });
  });

  it('routes minDiscounted through the shared validDiscount', () => {
    const badMin: Product = { ...product, minPrice: 1400, minDiscounted: 1900 };
    expect(resolveMinPrice(badMin).discountedPrice).toBeUndefined();
    const zeroMin: Product = { ...product, minPrice: 1400, minDiscounted: 0 };
    expect(resolveMinPrice(zeroMin).discountedPrice).toBeUndefined();
  });

  it('shows the cheapest-SKU figure (whether the card should quote base is undecided)', () => {
    // @todo-fix: cheapest-SKU price on the grid card — the card has no size
    // context, so resolveMinPrice quotes the lowest SKU. If product decides the
    // card must quote the base price instead, change resolveMinPrice here (the
    // PDP price card is unaffected — it uses resolveVariantPrice + isRange).
    const resolved = resolveMinPrice(product);
    expect(resolved.price).toBe(1400);
    expect(resolved.price).toBeLessThan(product.price);
  });

  it('falls back to base with no declared minimum', () => {
    const { minPrice: _minPrice, minDiscounted: _minDiscounted, ...rest } = product;
    expect(resolveMinPrice(rest)).toEqual({
      price: 1500,
      discountedPrice: 1200,
      source: 'product',
      isRange: false,
    });
  });
});

describe('shared validDiscount is the single choke point', () => {
  it('pricing.ts imports it instead of re-implementing the rule', () => {
    expect(PRICING_SRC).toContain("import { validDiscount } from '@celebs/shared-utils'");
    expect(PRICING_SRC).not.toMatch(/function validDiscount/);
  });

  it('the product card routes its math through it too', () => {
    expect(CARD_HOOK_SRC).toContain("import { validDiscount } from '@celebs/shared-utils'");
    expect(CARD_HOOK_SRC).toContain('validDiscount(');
  });

  it('the shared helper is the one every site agrees on', () => {
    expect(validDiscount(1500, 1900)).toBeUndefined();
    expect(validDiscount(1500, 1200)).toBe(1200);
  });
});
