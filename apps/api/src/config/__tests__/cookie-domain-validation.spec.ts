import { describe, expect, it } from 'vitest';

import { envSchema } from '../env.validation';

describe('Production Cookie Domain Environment Validation Contract', () => {
  const baseValidEnv = {
    DATABASE_URL: 'postgresql://postgres:celebs@localhost:5432/celebs_test',
    JWT_SECRET: 'test_jwt_secret_key_long_enough_for_hmac_32_chars',
    JWT_REFRESH_SECRET: 'test_jwt_refresh_secret_key_long_enough_for_hmac_32_chars',
    SETUP_SECRET: 'test-setup-secret-local-tests-only-00000000000000000000',
  };

  it('rejects production configuration when COOKIE_DOMAIN is missing or empty', () => {
    const resultMissing = envSchema.safeParse({
      ...baseValidEnv,
      NODE_ENV: 'production',
    });

    expect(resultMissing.success).toBe(false);
    if (!resultMissing.success) {
      const issue = resultMissing.error.issues.find((i) => i.path.includes('COOKIE_DOMAIN'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('COOKIE_DOMAIN must be explicitly configured');
    }

    const resultEmpty = envSchema.safeParse({
      ...baseValidEnv,
      NODE_ENV: 'production',
      COOKIE_DOMAIN: '   ',
    });

    expect(resultEmpty.success).toBe(false);
    if (!resultEmpty.success) {
      const issue = resultEmpty.error.issues.find((i) => i.path.includes('COOKIE_DOMAIN'));
      expect(issue).toBeDefined();
    }
  });

  it('accepts production configuration when COOKIE_DOMAIN is specified', () => {
    const result = envSchema.safeParse({
      ...baseValidEnv,
      NODE_ENV: 'production',
      COOKIE_DOMAIN: '.celebs.com.np',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.COOKIE_DOMAIN).toBe('.celebs.com.np');
    }
  });

  it('allows empty or omitted COOKIE_DOMAIN in development and test environments', () => {
    const devResult = envSchema.safeParse({
      ...baseValidEnv,
      NODE_ENV: 'development',
    });
    expect(devResult.success).toBe(true);

    const testResult = envSchema.safeParse({
      ...baseValidEnv,
      NODE_ENV: 'test',
    });
    expect(testResult.success).toBe(true);
  });
});
