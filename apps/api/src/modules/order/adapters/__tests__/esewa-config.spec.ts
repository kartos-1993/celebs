import { afterEach, describe, expect, it } from 'vitest';

import { resolveEsewaConfig } from '../esewa.adapter';

const SAVED_ENV = { ...process.env };

function setEnv(env: NodeJS.ProcessEnv) {
  for (const key of ['ESEWA_PRODUCT_CODE', 'ESEWA_SECRET_KEY'] as const) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
}

afterEach(() => {
  process.env = { ...SAVED_ENV };
});

describe('resolveEsewaConfig merchant credentials', () => {
  it('throws in staging when merchant credentials are missing', () => {
    setEnv({ NODE_ENV: 'staging' });
    expect(() => resolveEsewaConfig()).toThrow(/ESEWA_PRODUCT_CODE|ESEWA_SECRET_KEY/);
  });

  it('throws in production when merchant credentials are missing', () => {
    setEnv({ NODE_ENV: 'production' });
    expect(() => resolveEsewaConfig()).toThrow(/ESEWA_PRODUCT_CODE|ESEWA_SECRET_KEY/);
  });

  it('keeps test/dev ergonomics with safe defaults', () => {
    setEnv({ NODE_ENV: 'test' });
    const config = resolveEsewaConfig();
    expect(config.productCode).toBe('EPAYTEST');
  });

  it('refuses localhost callbacks in staging, which would strand customers after payment', () => {
    setEnv({
      NODE_ENV: 'staging',
      ESEWA_PRODUCT_CODE: 'EPAYTEST',
      ESEWA_SECRET_KEY: 'secret',
      ESEWA_SUCCESS_URL: 'http://localhost:3333/api/v1/orders/payments/esewa/success',
      ESEWA_FAILURE_URL: 'https://staging.celebs.com/api/v1/orders/payments/esewa/failure',
    });
    expect(() => resolveEsewaConfig()).toThrow(/ESEWA_SUCCESS_URL/);
  });

  it('accepts real callback URLs in production', () => {
    setEnv({
      NODE_ENV: 'production',
      ESEWA_PRODUCT_CODE: 'PROD-CODE',
      ESEWA_SECRET_KEY: 'prod-secret',
      ESEWA_SUCCESS_URL: 'https://celebs.com/api/v1/orders/payments/esewa/success',
      ESEWA_FAILURE_URL: 'https://celebs.com/api/v1/orders/payments/esewa/failure',
    });
    const config = resolveEsewaConfig();
    expect(config.successUrl).toContain('https://celebs.com');
  });
});
