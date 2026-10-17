import { describe, expect, it } from 'vitest';

import { envSchema } from '../env.validation';

describe('environment SETUP_SECRET validation', () => {
  const baseEnv = {
    DATABASE_URL: 'postgresql://postgres:celebs@localhost:5432/celebs_test',
    JWT_SECRET: 'test_jwt_secret_key_long_enough_for_hmac_32_chars',
    JWT_REFRESH_SECRET: 'test_jwt_refresh_secret_key_long_enough_for_hmac_32_chars',
  };

  it('rejects the publicly-known default setup secret', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      SETUP_SECRET: 'celebs-superadmin-secret-2026',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short setup secrets (<32 chars)', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      SETUP_SECRET: 'short-secret',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a strong random setup secret (>=32 chars)', () => {
    const result = envSchema.safeParse({
      ...baseEnv,
      SETUP_SECRET: 'test-setup-secret-local-tests-only-00000000000000000000',
    });
    expect(result.success).toBe(true);
  });
});
