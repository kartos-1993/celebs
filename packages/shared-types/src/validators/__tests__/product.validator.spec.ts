import { describe, expect, it } from 'vitest';

import { productFilterSchema } from '../product.validator';

describe('productFilterSchema (Filter Pipeline TDD)', () => {
  it('parses comma-separated sizes into a string array', () => {
    const parsed = productFilterSchema.parse({ sizes: 'S, M, L' });
    expect(parsed.sizes).toEqual(['S', 'M', 'L']);
  });

  it('accepts array of sizes directly', () => {
    const parsed = productFilterSchema.parse({ sizes: ['S', 'M', 'XL'] });
    expect(parsed.sizes).toEqual(['S', 'M', 'XL']);
  });

  it('parses comma-separated colors into a string array', () => {
    const parsed = productFilterSchema.parse({ colors: 'Black, Indigo Blue' });
    expect(parsed.colors).toEqual(['Black', 'Indigo Blue']);
  });

  it('parses fits array', () => {
    const parsed = productFilterSchema.parse({ fits: ['Slim Fit', 'Oversized'] });
    expect(parsed.fits).toEqual(['Slim Fit', 'Oversized']);
  });

  it('accepts valid stockState filter values', () => {
    expect(productFilterSchema.parse({ stockState: 'all' }).stockState).toBe('all');
    expect(productFilterSchema.parse({ stockState: 'in' }).stockState).toBe('in');
    expect(productFilterSchema.parse({ stockState: 'low' }).stockState).toBe('low');
    expect(productFilterSchema.parse({ stockState: 'out' }).stockState).toBe('out');
  });

  it('parses custom dynamic attributes record', () => {
    const parsed = productFilterSchema.parse({
      attributes: { fit: 'Slim Fit', fabric: 'Cotton' },
    });
    expect(parsed.attributes).toEqual({ fit: 'Slim Fit', fabric: 'Cotton' });
  });
});
