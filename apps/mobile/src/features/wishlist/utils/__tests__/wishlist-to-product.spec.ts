import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { WishlistEntryView } from '../../types';
import { toProduct } from '../to-product';

const SRC = readFileSync(resolve(__dirname, '../to-product.ts'), 'utf8');

function entry(overrides: Partial<WishlistEntryView> = {}): WishlistEntryView {
  return {
    id: 'w1',
    productId: 'p1',
    addedAt: '2026-01-01',
    product: { id: 'p1', name: 'Tee', slug: 'tee', price: 1000, mainImages: ['img'] },
    ...overrides,
  };
}

describe('toProduct', () => {
  it('maps hydrated product fields through and never hardcodes a status', () => {
    // The wishlist row is the one payload that still arrives with the raw
    // `mainImages` gallery; it is folded into the single derived `cover` the
    // grid card reads.
    expect(toProduct(entry())).toEqual({
      id: 'p1',
      name: 'Tee',
      price: 1000,
      cover: 'img',
    });
    expect(toProduct(entry())).not.toHaveProperty('status');
    expect(SRC).not.toContain("status: 'published'");
  });

  it('coerces a NaN price to 0 instead of leaking NaN', () => {
    const p = toProduct(
      entry({ product: { id: 'p1', name: 'T', slug: '', price: Number.NaN, mainImages: [] } }),
    );
    expect(p.price).toBe(0);
  });

  it('validates the discount through the shared choke point', () => {
    expect(SRC).toContain("import { validDiscount } from '@celebs/shared-utils'");
    const above = toProduct(
      entry({
        product: {
          id: 'p1',
          name: 'T',
          slug: '',
          price: 1000,
          discountedPrice: 1500,
          mainImages: [],
        },
      }),
    );
    expect(above.discountedPrice).toBeUndefined();
    const below = toProduct(
      entry({
        product: {
          id: 'p1',
          name: 'T',
          slug: '',
          price: 1000,
          discountedPrice: 800,
          mainImages: [],
        },
      }),
    );
    expect(below.discountedPrice).toBe(800);
  });

  it('omits brand when falsy, keeps when present', () => {
    expect(toProduct(entry())).not.toHaveProperty('brand');
    expect(
      toProduct(
        entry({
          product: { id: 'p', name: 'N', slug: '', price: 1, mainImages: [], brand: 'Nike' },
        }),
      ).brand,
    ).toBe('Nike');
  });

  it('derives no cover from a malformed / empty gallery instead of inventing one', () => {
    const malformed = toProduct(
      entry({ product: { id: 'p', name: 'N', slug: '', price: 1, mainImages: 'x' as never } }),
    );
    expect(malformed.cover).toBeUndefined();
    expect(SRC).not.toContain("cover: '");
    const empty = toProduct(
      entry({ product: { id: 'p', name: 'N', slug: '', price: 1, mainImages: [] } }),
    );
    expect(empty.cover).toBeUndefined();
  });

  it('prefers the row cover, then falls back to the first gallery photo', () => {
    expect(
      toProduct(
        entry({
          product: { id: 'p', name: 'N', slug: '', price: 1, mainImages: ['a'], cover: 'b' },
        }),
      ).cover,
    ).toBe('b');
    expect(
      toProduct(entry({ product: { id: 'p', name: 'N', slug: '', price: 1, mainImages: ['a'] } }))
        .cover,
    ).toBe('a');
  });

  it('never invents a fallback name or id from the entry', () => {
    expect(SRC).not.toContain("'Product'");
    expect(SRC).not.toContain('entry?.productId');
  });
});
