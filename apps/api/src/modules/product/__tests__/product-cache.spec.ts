import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PRODUCT_DETAIL_TTL_SECONDS,
  PRODUCT_LIST_TTL_SECONDS,
  productDetailKey,
  productListKey,
  purgeProduct,
  purgeProductDetail,
  purgeProductHome,
  signListQuery,
  STOREFRONT_HOME_KEY,
} from '../product-cache';

const del = vi.fn();
const get = vi.fn();
const set = vi.fn();

vi.mock('@/common/services/redis-cache.service', () => ({
  getCachedJson: (...args: unknown[]) => get(...args),
  setCachedJson: (...args: unknown[]) => set(...args),
  invalidateCacheKey: (...args: unknown[]) => del(...args),
}));

describe('Product cache keys and purge wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('produces the same list signature regardless of key order', () => {
    const a = signListQuery({ search: 'coat', page: 1, limit: 10 });
    const b = signListQuery({ limit: 10, page: 1, search: 'coat' });
    expect(a).toBe(b);
  });

  it('ignores empty filter values and separates distinct queries', () => {
    const base = signListQuery({ search: 'coat', status: undefined });
    expect(base).toBe(signListQuery({ search: 'coat', status: '', extra: null }));
    expect(base).not.toBe(signListQuery({ search: 'jacket' }));
  });

  it('scopes detail keys by elevation so public and admin never share', () => {
    expect(productDetailKey('abc')).toBe('product:detail:abc:pub');
    expect(productDetailKey('abc', true)).toBe('product:detail:abc:elev');
    expect(productDetailKey('abc')).not.toBe(productDetailKey('abc', true));
  });

  it('namespaces list keys and documents TTL budgets', () => {
    expect(productListKey('deadbeef')).toBe('product:list:deadbeef');
    expect(PRODUCT_DETAIL_TTL_SECONDS).toBe(300);
    expect(PRODUCT_LIST_TTL_SECONDS).toBe(60);
    expect(STOREFRONT_HOME_KEY).toBe('storefront:home');
  });

  it('purges both detail scopes but never the home key on detail-only purge', async () => {
    purgeProductDetail('abc');
    await vi.waitFor(() => expect(del).toHaveBeenCalledTimes(2));
    expect(del).toHaveBeenCalledWith('product:detail:abc:pub');
    expect(del).toHaveBeenCalledWith('product:detail:abc:elev');
    expect(del).not.toHaveBeenCalledWith('storefront:home');
  });

  it('purges the home key alone on home-only purge', async () => {
    purgeProductHome();
    await vi.waitFor(() => expect(del).toHaveBeenCalledTimes(1));
    expect(del).toHaveBeenCalledWith('storefront:home');
  });

  it('purges detail scopes plus home on full product purge', async () => {
    purgeProduct('abc');
    await vi.waitFor(() => expect(del).toHaveBeenCalledTimes(3));
    expect(del).toHaveBeenCalledWith('product:detail:abc:pub');
    expect(del).toHaveBeenCalledWith('product:detail:abc:elev');
    expect(del).toHaveBeenCalledWith('storefront:home');
  });
});
