import { describe, expect, it } from 'vitest';

import {
  expectBrowserCacheable,
  expectCorsExposes,
  expectNoStore,
  expectNotPublic,
  expectQuotedETag,
  expectSharedCacheable,
  expectVary,
} from '../http-headers';

describe('HTTP Header Test Assertion Helpers', () => {
  it('correctly validates no-store cache control directives', () => {
    const valid = { headers: { 'cache-control': 'private, no-store, no-cache, must-revalidate' } };
    expect(() => expectNoStore(valid)).not.toThrow();

    const leakedPublic = { headers: { 'cache-control': 'public, no-store, max-age=0' } };
    expect(() => expectNoStore(leakedPublic)).toThrow();

    const missing = { headers: {} };
    expect(() => expectNoStore(missing)).toThrow();
  });

  it('correctly validates shared public cache directives and minimum max-age', () => {
    const valid = {
      headers: { 'cache-control': 'public, max-age=30, stale-while-revalidate=120' },
    };
    expect(() => expectSharedCacheable(valid, 30)).not.toThrow();

    const insufficientAge = { headers: { 'cache-control': 'public, max-age=10' } };
    expect(() => expectSharedCacheable(insufficientAge, 30)).toThrow();

    const markedPrivate = { headers: { 'cache-control': 'public, private, max-age=30' } };
    expect(() => expectSharedCacheable(markedPrivate)).toThrow();
  });

  it('correctly validates browser cacheable directives for private responses', () => {
    const validPrivate = { headers: { 'cache-control': 'private, max-age=60' } };
    expect(() => expectBrowserCacheable(validPrivate, 60)).not.toThrow();

    const noStore = { headers: { 'cache-control': 'private, no-store, max-age=60' } };
    expect(() => expectBrowserCacheable(noStore)).toThrow();
  });

  it('correctly checks that public directive is not present', () => {
    const valid = { headers: { 'cache-control': 'private, no-cache' } };
    expect(() => expectNotPublic(valid)).not.toThrow();

    const publicResp = { headers: { 'cache-control': 'public, max-age=30' } };
    expect(() => expectNotPublic(publicResp)).toThrow();
  });

  it('correctly validates Vary header presence and token contents', () => {
    const valid = { headers: { vary: 'Accept-Encoding, Authorization, X-Surface' } };
    expect(() => expectVary(valid, ['Accept-Encoding', 'Authorization'])).not.toThrow();

    const missingToken = { headers: { vary: 'Accept-Encoding' } };
    expect(() => expectVary(missingToken, ['Authorization'])).toThrow();
  });

  it('correctly enforces RFC 9110 quoted ETag strings', () => {
    const validWeak = { headers: { etag: 'W/"abc12345"' } };
    expect(expectQuotedETag(validWeak)).toBe('W/"abc12345"');

    const validStrong = { headers: { etag: '"abc12345"' } };
    expect(expectQuotedETag(validStrong)).toBe('"abc12345"');

    const unquoted = { headers: { etag: 'abc12345' } };
    expect(() => expectQuotedETag(unquoted)).toThrow();
  });

  it('correctly verifies Access-Control-Expose-Headers values', () => {
    const valid = {
      headers: {
        'access-control-expose-headers': 'x-session-id, x-request-id, etag, retry-after',
      },
    };
    expect(() => expectCorsExposes(valid, ['etag', 'retry-after'])).not.toThrow();

    const missing = {
      headers: {
        'access-control-expose-headers': 'x-session-id',
      },
    };
    expect(() => expectCorsExposes(missing, ['etag'])).toThrow();
  });
});
