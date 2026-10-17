import { describe, expect, it } from 'vitest';

import { PRODUCT_QUERY_KEYS, serializeQueryParams } from '../../../api';

/**
 * The variant-axis read is keyed off `dataSource`, whose `params` arrive as an
 * inline object from the render schema. Keying the query on that object
 * re-keys the cache on every render, so the key carries a serialised form
 * instead. These assertions pin that determinism plus the centralised key
 * factory requirement (AGENTS.md §2/§9).
 */
describe('variant-axis query key', () => {
  it('serialises params into a deterministic fragment regardless of key order', () => {
    const a = serializeQueryParams({ catId: 'c1', locale: 'en_US' });
    const b = serializeQueryParams({ locale: 'en_US', catId: 'c1' });
    expect(a).toBe(b);
    expect(a).toBe('{"catId":"c1","locale":"en_US"}');
  });

  it('treats distinct param sets as distinct fragments', () => {
    expect(serializeQueryParams({ catId: 'c1' })).not.toBe(serializeQueryParams({ catId: 'c2' }));
  });

  it('uses an empty fragment for absent params so a key never holds undefined', () => {
    expect(serializeQueryParams()).toBe('');
    expect(serializeQueryParams(undefined)).toBe('');
  });

  it('comes from the centralised factory and stays stable across renders', () => {
    // The caller passes the object; the factory serialises, so a fresh object
    // literal on every render still yields one stable key.
    const first = PRODUCT_QUERY_KEYS.variantAxes('/option-sets/9', { catId: 'c1' });
    const second = PRODUCT_QUERY_KEYS.variantAxes('/option-sets/9', { catId: 'c1' });
    expect(first).toEqual(second);
    expect(first).toEqual(['products', 'variant-axes', '/option-sets/9', '{"catId":"c1"}']);
    expect(PRODUCT_QUERY_KEYS.variantAxes('/option-sets/9', { catId: 'c2' })).not.toEqual(first);
  });
});
