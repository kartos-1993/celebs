import { describe, expect, it } from 'vitest';

import { resolveCallbackBase } from '../callback-base';

const FALLBACK = 'http://localhost:3333';

describe('resolveCallbackBase', () => {
  it('accepts the same host the request arrived on', () => {
    expect(resolveCallbackBase('http://192.168.1.20:3333', '192.168.1.20:3333', FALLBACK)).toBe(
      'http://192.168.1.20:3333',
    );
  });

  it('accepts LAN and loopback origins even without a matching Host header', () => {
    expect(resolveCallbackBase('http://192.168.1.20:3333', undefined, FALLBACK)).toBe(
      'http://192.168.1.20:3333',
    );
    expect(resolveCallbackBase('http://10.0.0.8:3333/api/v1', undefined, FALLBACK)).toBe(
      'http://10.0.0.8:3333',
    );
    expect(resolveCallbackBase('http://localhost:3333', undefined, FALLBACK)).toBe(
      'http://localhost:3333',
    );
  });

  it('accepts trusted platform and tunnel suffixes', () => {
    expect(
      resolveCallbackBase('https://celebs-api-staging.onrender.com', undefined, FALLBACK),
    ).toBe('https://celebs-api-staging.onrender.com');
    expect(resolveCallbackBase('https://abc123.ngrok.io', undefined, FALLBACK)).toBe(
      'https://abc123.ngrok.io',
    );
  });

  it('rejects lookalike domains, credentials, non-http and garbage', () => {
    expect(resolveCallbackBase('https://celebs.com.np.evil.com', undefined, FALLBACK)).toBe(
      FALLBACK,
    );
    expect(resolveCallbackBase('https://evilcelebs.com.np', undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveCallbackBase('http://user:pass@192.168.1.20:3333', undefined, FALLBACK)).toBe(
      FALLBACK,
    );
    expect(resolveCallbackBase('ftp://192.168.1.20/x', undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveCallbackBase('not-a-url', undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveCallbackBase(undefined, undefined, FALLBACK)).toBe(FALLBACK);
    // Public IP that is neither the request host nor allowlisted.
    expect(resolveCallbackBase('http://203.0.113.9:3333', undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('strips paths and normalizes the origin', () => {
    expect(resolveCallbackBase('http://192.168.1.20:3333/api/v1/', undefined, FALLBACK)).toBe(
      'http://192.168.1.20:3333',
    );
  });
});
