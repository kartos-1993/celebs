import { describe, expect, it } from 'vitest';

import { STOREFRONT_HOME_CACHE_KEY, STOREFRONT_HOME_TTL_SECONDS } from '../storefront.constants';

describe('Storefront Cache Constants Single Source of Truth Contract', () => {
  it('exports canonical STOREFRONT_HOME_CACHE_KEY as storefront:home', () => {
    expect(STOREFRONT_HOME_CACHE_KEY).toBe('storefront:home');
  });

  it('exports a positive TTL for storefront home cache', () => {
    expect(STOREFRONT_HOME_TTL_SECONDS).toBeGreaterThan(0);
    expect(STOREFRONT_HOME_TTL_SECONDS).toBe(600);
  });
});
