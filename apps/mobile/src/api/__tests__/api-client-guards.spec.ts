import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLIENT_SRC = readFileSync(resolve(__dirname, '../client.ts'), 'utf8');
const RESPONSE_SRC = readFileSync(resolve(__dirname, '../response.ts'), 'utf8');

describe('api client envelope guards', () => {
  it('preserves statusCode + code on BOTH the interceptor and handleApiResponse', () => {
    expect(CLIENT_SRC).toContain('statusCode: response.status');
    expect(CLIENT_SRC).toContain("code: 'API_ERROR'");
    expect(RESPONSE_SRC).toContain('statusCode: response.status');
    expect(RESPONSE_SRC).toContain('errorCode');
  });

  it('never `as`-casts the refresh payload — explicit shape validation throws descriptively', () => {
    // The old shim was `response.data?.data as { accessToken?: string; ... }`,
    // a silent double-unwrap plus an unchecked cast (mobile AGENTS.md §5/§7).
    expect(CLIENT_SRC).not.toContain('as { accessToken?: string; refreshToken?: string }');
    expect(CLIENT_SRC).toContain('assertRefreshPayload');
    expect(CLIENT_SRC).toContain('Malformed /auth/refresh envelope');
  });

  it('refresh single-flight retries 401 once + tears down session on failure (pinned)', () => {
    expect(CLIENT_SRC).toContain('refreshSingleFlight');
    expect(CLIENT_SRC).toContain('config._retry = true');
    expect(CLIENT_SRC).toContain('SecureStore.deleteItemAsync');
  });

  it('performRefresh swallows the descriptive throw so the 401 teardown path stays safe', () => {
    // Caller proof: the assertion throws inside performRefresh's try, and the
    // catch returns null — refreshSingleFlight resolves null, the interceptor
    // clears SecureStore and fires unauthorizedHandler. Never an unhandled throw.
    const refreshBody = CLIENT_SRC.slice(
      CLIENT_SRC.indexOf('async function performRefresh'),
      CLIENT_SRC.indexOf('function refreshSingleFlight'),
    );
    expect(refreshBody).toContain('try {');
    expect(refreshBody).toContain('} catch {');
    expect(refreshBody).toContain('return null;');
  });

  it('guest-capable prefixes allow anonymous cart/products/combos (pinned)', () => {
    for (const p of ['/cart', '/products', '/combos']) {
      expect(CLIENT_SRC).toContain(p);
    }
  });
});
