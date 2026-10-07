import { afterEach, describe, expect, it } from 'vitest';

import { resolveKhaltiConfig } from '../khalti.adapter';

const SAVED_ENV = { ...process.env };

function setEnv(env: NodeJS.ProcessEnv) {
  for (const key of [
    'KHALTI_SECRET_KEY',
    'KHALTI_RETURN_URL',
    'KHALTI_WEBSITE_URL',
    'KHALTI_BASE_URL',
  ] as const) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
}

afterEach(() => {
  process.env = { ...SAVED_ENV };
});

describe('resolveKhaltiConfig merchant credentials', () => {
  it('throws in staging when the secret key is missing', () => {
    setEnv({ NODE_ENV: 'staging' });
    expect(() => resolveKhaltiConfig()).toThrow(/KHALTI_SECRET_KEY/);
  });

  it('throws in production when the secret key is missing', () => {
    setEnv({ NODE_ENV: 'production' });
    expect(() => resolveKhaltiConfig()).toThrow(/KHALTI_SECRET_KEY/);
  });

  it('refuses localhost callbacks in staging, which would strand paying customers', () => {
    setEnv({
      NODE_ENV: 'staging',
      KHALTI_SECRET_KEY: 'live-key',
      KHALTI_RETURN_URL: 'http://localhost:3333/api/v1/orders/payments/khalti/return',
    });
    expect(() => resolveKhaltiConfig()).toThrow(/KHALTI_RETURN_URL/);
  });

  it('keeps test/dev ergonomics with safe defaults', () => {
    setEnv({ NODE_ENV: 'test' });
    const config = resolveKhaltiConfig();
    expect(config.baseUrl).toBe('https://dev.khalti.com');
  });
});
