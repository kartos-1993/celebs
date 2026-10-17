import { describe, expect, it } from 'vitest';

import { isAllowedOrigin } from '../origin.util';

describe('Unified Origin Allowlist Policy Contract', () => {
  it('allows exact matches from configured origins list', () => {
    const configuredOrigins = ['https://admin.celebs.com.np', 'https://celebs.com.np'];

    expect(isAllowedOrigin('https://admin.celebs.com.np', configuredOrigins, 'production')).toBe(
      true,
    );
    expect(isAllowedOrigin('https://celebs.com.np', configuredOrigins, 'production')).toBe(true);
  });

  it('rejects untrusted domains in production environment', () => {
    const configuredOrigins = ['https://admin.celebs.com.np'];

    expect(isAllowedOrigin('https://malicious-site.com', configuredOrigins, 'production')).toBe(
      false,
    );
    expect(
      isAllowedOrigin('https://admin.celebs.com.np.attacker.com', configuredOrigins, 'production'),
    ).toBe(false);
    expect(isAllowedOrigin('http://localhost:3000', configuredOrigins, 'production')).toBe(false);
    expect(isAllowedOrigin('http://192.168.1.50:8081', configuredOrigins, 'production')).toBe(
      false,
    );
  });

  it('allows localhost and local area network IP addresses in development or test environment', () => {
    const configuredOrigins = ['https://admin.celebs.com.np'];

    expect(isAllowedOrigin('http://localhost:3000', configuredOrigins, 'development')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:5173', configuredOrigins, 'development')).toBe(true);
    expect(isAllowedOrigin('http://192.168.1.100:8081', configuredOrigins, 'development')).toBe(
      true,
    );
    expect(isAllowedOrigin('http://10.0.2.2:3333', configuredOrigins, 'development')).toBe(true);
    expect(isAllowedOrigin('http://172.20.10.2:8080', configuredOrigins, 'test')).toBe(true);
  });

  it('safely rejects empty, undefined, null, or malformed origin values without throwing', () => {
    const configuredOrigins = ['https://admin.celebs.com.np'];

    expect(isAllowedOrigin(undefined, configuredOrigins, 'development')).toBe(false);
    expect(isAllowedOrigin(null as unknown as string, configuredOrigins, 'development')).toBe(
      false,
    );
    expect(isAllowedOrigin('', configuredOrigins, 'development')).toBe(false);
    expect(isAllowedOrigin('   ', configuredOrigins, 'development')).toBe(false);
    expect(isAllowedOrigin('not-a-valid-url', configuredOrigins, 'development')).toBe(false);
  });
});
