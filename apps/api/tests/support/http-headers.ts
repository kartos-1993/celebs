import { expect } from 'vitest';

export interface HeaderCarrier {
  headers?: Record<string, string | string[] | number | undefined>;
  header?: Record<string, string | string[] | number | undefined>;
}

function getHeaderString(res: HeaderCarrier, name: string): string | undefined {
  const headers = res.headers || res.header || {};
  const target = name.toLowerCase();

  for (const [key, val] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      if (Array.isArray(val)) return val.join(', ');
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return String(val);
      return undefined;
    }
  }
  return undefined;
}

/**
 * Asserts that the response carries a Cache-Control header forbidding caching (no-store).
 * Ensures it is never tagged as public.
 */
export function expectNoStore(res: HeaderCarrier): void {
  const cacheControl = getHeaderString(res, 'cache-control');
  expect(cacheControl, 'Cache-Control header must be present').toBeDefined();
  expect(cacheControl?.toLowerCase()).toContain('no-store');
  expect(cacheControl?.toLowerCase()).not.toContain('public');
}

/**
 * Asserts that the response is cacheable by shared intermediaries (CDNs, edge caches).
 * Must carry 'public', must not carry 'no-store' or 'private', and must meet minMaxAge.
 */
export function expectSharedCacheable(res: HeaderCarrier, minMaxAge = 0): void {
  const cacheControl = getHeaderString(res, 'cache-control');
  expect(cacheControl, 'Cache-Control header must be present').toBeDefined();
  const lower = cacheControl!.toLowerCase();

  expect(lower).toContain('public');
  expect(lower).not.toContain('no-store');
  expect(lower).not.toContain('private');

  if (minMaxAge > 0) {
    const match = lower.match(/max-age=(\d+)/);
    expect(match, 'max-age directive must be present in Cache-Control').not.toBeNull();
    const maxAge = parseInt(match![1], 10);
    expect(maxAge).toBeGreaterThanOrEqual(minMaxAge);
  }
}

/**
 * Asserts that the response is cacheable by the client browser (public OR private),
 * but not blocked by no-store, and satisfies minimum max-age.
 */
export function expectBrowserCacheable(res: HeaderCarrier, minMaxAge = 0): void {
  const cacheControl = getHeaderString(res, 'cache-control');
  expect(cacheControl, 'Cache-Control header must be present').toBeDefined();
  const lower = cacheControl!.toLowerCase();

  const isCacheable = lower.includes('public') || lower.includes('private');
  expect(isCacheable, 'Cache-Control must contain either "public" or "private"').toBe(true);
  expect(lower).not.toContain('no-store');

  if (minMaxAge > 0) {
    const match = lower.match(/max-age=(\d+)/);
    expect(match, 'max-age directive must be present in Cache-Control').not.toBeNull();
    const maxAge = parseInt(match![1], 10);
    expect(maxAge).toBeGreaterThanOrEqual(minMaxAge);
  }
}

/**
 * Asserts that the response explicitly does NOT allow shared/public caching.
 */
export function expectNotPublic(res: HeaderCarrier): void {
  const cacheControl = getHeaderString(res, 'cache-control');
  if (cacheControl) {
    expect(cacheControl.toLowerCase()).not.toContain('public');
  }
}

/**
 * Asserts that the response emits a Vary header containing all expected token values.
 */
export function expectVary(res: HeaderCarrier, tokens: string[]): void {
  const vary = getHeaderString(res, 'vary');
  expect(vary, 'Vary header must be present').toBeDefined();
  const lower = vary!.toLowerCase();

  for (const token of tokens) {
    expect(lower).toContain(token.toLowerCase());
  }
}

/**
 * Asserts that the response emits an ETag header that conforms to RFC 9110 (quoted string).
 */
export function expectQuotedETag(res: HeaderCarrier): string {
  const etag = getHeaderString(res, 'etag');
  expect(etag, 'ETag header must be present').toBeDefined();
  // Must be either W/"<tag>" (weak) or "<tag>" (strong)
  expect(etag).toMatch(/^(W\/)?"[^"]+"$/);
  return etag!;
}

/**
 * Asserts that CORS Access-Control-Expose-Headers contains the specified header names.
 */
export function expectCorsExposes(res: HeaderCarrier, headers: string[]): void {
  const exposed = getHeaderString(res, 'access-control-expose-headers');
  expect(exposed, 'Access-Control-Expose-Headers must be present').toBeDefined();
  const lower = exposed!.toLowerCase();

  for (const h of headers) {
    expect(lower).toContain(h.toLowerCase());
  }
}
