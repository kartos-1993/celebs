import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PRODUCTS_HOOK_SRC = readFileSync(resolve(__dirname, '../hooks/use-products.ts'), 'utf8');
const PRODUCTS_API_SRC = readFileSync(resolve(__dirname, '../api.ts'), 'utf8');
const CLIENT_SRC = readFileSync(resolve(__dirname, '../../../api/client.ts'), 'utf8');
const RESPONSE_SRC = readFileSync(resolve(__dirname, '../../../api/response.ts'), 'utf8');
const GRID_SRC = readFileSync(resolve(__dirname, '../components/product-grid.tsx'), 'utf8');

describe('products pagination', () => {
  it('getNextPageParam honors the server hasMore flag', () => {
    expect(PRODUCTS_HOOK_SRC).toContain('lastPage.hasMore === false');
    const getNextPageParam = (lastPage: { nextCursor?: string | null; hasMore?: boolean }) =>
      lastPage.hasMore === false ? null : (lastPage.nextCursor ?? null);
    // A stale cursor with hasMore:false must NOT paginate.
    expect(getNextPageParam({ nextCursor: 'abc', hasMore: false })).toBeNull();
    // hasMore:true with no cursor is still the end of the catalog.
    expect(getNextPageParam({ hasMore: true })).toBeNull();
    expect(getNextPageParam({ hasMore: true, nextCursor: 'abc' })).toBe('abc');
    expect(getNextPageParam({})).toBeNull();
  });

  it('stops retrying 404s but keeps transient errors retryable', () => {
    expect(RESPONSE_SRC).toContain('isNonRetryableApiError');
    expect(RESPONSE_SRC).toContain('404');
    expect(PRODUCTS_HOOK_SRC).toContain('isNonRetryableApiError');
    // The 401 refresh/retry path is unrelated to query-level retries.
    expect(CLIENT_SRC).toContain('status === 401');
    expect(CLIENT_SRC).not.toMatch(/status === 404[\s\S]*retry/);
  });

  it('validates the page shape at the API boundary instead of coercing to []', () => {
    // AGENTS.md §5: no `page.products ?? []` fallback cascade — the boundary
    // validates once, so a malformed page is a loud failure, not an empty grid.
    expect(PRODUCTS_API_SRC).toContain('assertPaginatedProducts');
    expect(PRODUCTS_HOOK_SRC).not.toContain('page.products ?? []');
    expect(PRODUCTS_API_SRC).not.toContain('products ?? []');
  });

  it('surfaces a "results capped" signal instead of silently truncating at maxPages', () => {
    expect(PRODUCTS_HOOK_SRC).toMatch(/const MAX_PAGES = 4/);
    expect(PRODUCTS_HOOK_SRC).toMatch(/maxPages:\s*MAX_PAGES/);
    expect(PRODUCTS_HOOK_SRC).toContain('isResultsCapped');
    expect(PRODUCTS_HOOK_SRC).toContain('resultsCapped');
    expect(GRID_SRC).toContain('resultsCapped');
  });

  it('always forces status published + skipAuth on list fetch (pinned as-is)', () => {
    expect(PRODUCTS_API_SRC).toContain("status: 'published'");
    expect(PRODUCTS_API_SRC).toContain('skipAuth: true');
  });

  it('uses the centralized query-key factory (no hardcoded arrays)', () => {
    expect(PRODUCTS_HOOK_SRC).toContain('PRODUCT_QUERY_KEYS');
    expect(PRODUCTS_HOOK_SRC).not.toContain("queryKey: ['products', 'list']");
    expect(PRODUCTS_HOOK_SRC).toContain('PRODUCT_QUERY_KEYS.lists()');
  });
});
