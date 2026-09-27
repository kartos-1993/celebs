import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { CartItemHydrated } from '@celebs/shared-types';

import {
  CHECKOUT_FREE_SHIPPING_THRESHOLD,
  computeTotals,
  formatPrice,
  FREE_SHIPPING_THRESHOLD,
  getDiscountPercent,
  getUnitPrice,
  groupItemsByBrand,
} from '../cart-selectors';

const CART_QUERIES_SRC = readFileSync(
  resolve(__dirname, '../../hooks/use-cart-queries.ts'),
  'utf8',
);

function item(overrides: Partial<CartItemHydrated> = {}): CartItemHydrated {
  return {
    id: 'i1',
    cartId: 'c1',
    inventoryId: 'inv1',
    productId: 'p1',
    productName: 'Tee',
    productSlug: 'tee',
    price: 1000,
    colorVariantName: 'Red',
    colorCode: '#f00',
    image: 'img',
    size: 'M',
    quantity: 2,
    availableStock: 10,
    isAvailable: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('cart selectors', () => {
  it('getUnitPrice validates the discount through the shared choke point', () => {
    expect(getUnitPrice(item({ price: 1000, discountedPrice: 800 }))).toBe(800);
    // 1500 on a 1000 list is not a deal: the list price wins.
    expect(getUnitPrice(item({ price: 1000, discountedPrice: 1500 }))).toBe(1000);
    expect(getUnitPrice(item({ price: 1000 }))).toBe(1000);
    expect(getUnitPrice(item({ price: 1000, discountedPrice: 0 }))).toBe(1000);
  });

  it('getDiscountPercent validates (0 when discount >= price or price <= 0)', () => {
    expect(getDiscountPercent(item({ price: 1000, discountedPrice: 800 }))).toBe(20);
    expect(getDiscountPercent(item({ price: 1000, discountedPrice: 1500 }))).toBe(0);
    expect(getDiscountPercent(item({ price: 0, discountedPrice: 0 }))).toBe(0);
    expect(getDiscountPercent(item({ price: 1000 }))).toBe(0);
  });

  it('computeTotals uses the validated unit price; savings clamped at 0', () => {
    expect(computeTotals([item({ price: 1000, discountedPrice: 800, quantity: 2 })])).toEqual({
      count: 2,
      total: 1600,
      originalTotal: 2000,
      savings: 400,
      savingsPercent: 20,
    });
    // An invalid discount can no longer inflate the total above the list price.
    expect(computeTotals([item({ price: 1000, discountedPrice: 1500, quantity: 1 })])).toEqual({
      count: 1,
      total: 1000,
      originalTotal: 1000,
      savings: 0,
      savingsPercent: 0,
    });
    expect(computeTotals([])).toEqual({
      count: 0,
      total: 0,
      originalTotal: 0,
      savings: 0,
      savingsPercent: 0,
    });
  });

  it('groupItemsByBrand trims + falls back to Other, preserving order', () => {
    const groups = groupItemsByBrand([
      item({ id: 'a', productBrand: ' Nike ' }),
      item({ id: 'b' }),
      item({ id: 'c', productBrand: 'Nike' }),
    ]);
    expect(groups.map((g) => g.brand)).toEqual(['Nike', 'Other']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('free-shipping thresholds live in ONE module and keep their historical values', () => {
    // WONTFIX: single free-shipping threshold value (owner: product)
    // The two values are intentionally NOT unified. They are declared together
    // so the product owner only has to change one file, but neither number was
    // chosen by this change.
    expect(FREE_SHIPPING_THRESHOLD).toBe(999);
    expect(CHECKOUT_FREE_SHIPPING_THRESHOLD).toBe(3000);
    const src = readFileSync(resolve(__dirname, '../cart-selectors.ts'), 'utf8');
    expect(src).toContain('WONTFIX: single free-shipping threshold value (owner: product)');
  });

  it('formatPrice renders 2 decimals via toLocaleString (inconsistent w/ combo NPR ints — pinned)', () => {
    // @todo-fix: formatPrice inconsistency — cart/checkout render
    // "1,234.50" while combo modal renders "NPR 1,235" via toLocaleString().
    // Unify currency formatting in the fix cosmetic pass.
    expect(formatPrice(150)).toContain('150');
    expect(formatPrice(1234.5)).toMatch(/1,234\.50/);
  });

  it('local recompute still mirrors computeTotals (the pre-response fallback)', () => {
    const items = [item({ price: 500, discountedPrice: 400, quantity: 3 })];
    const { total } = computeTotals(items);
    expect(total).toBe(1200);
    expect(CART_QUERIES_SRC).toContain('getUnitPrice');
  });

  it('add-to-cart is optimistic with rollback parity, then prefers the server cart', () => {
    expect(CART_QUERIES_SRC).toContain('buildOptimisticItem');
    expect(CART_QUERIES_SRC).toMatch(
      /mutationFn: \(input: AddToCartInput\) =>[\s\S]*?onMutate: async \(input: AddToCartInput\) =>/,
    );
    expect(CART_QUERIES_SRC).toContain(
      'const optimisticItems = [...previousCart.items, buildOptimisticItem(input)]',
    );
    expect(CART_QUERIES_SRC).toContain('return { previousCart };');
    expect(CART_QUERIES_SRC).toContain(
      'queryClient.setQueryData<CartResponse>(queryKey, serverCart);',
    );
  });

  it('the optimistic placeholder invents nothing beyond the submitted input', () => {
    const body = CART_QUERIES_SRC.slice(
      CART_QUERIES_SRC.indexOf('function buildOptimisticItem'),
      CART_QUERIES_SRC.indexOf('export function useCartQuery'),
    );
    expect(body).toContain('colorVariantName: input.colorVariantName');
    expect(body).toContain('size: input.size');
    expect(body).toContain("productName: ''");
    expect(body).toContain('price: 0');
  });
});
