import type { Test } from 'supertest';

import { config } from '@/config/app.config';

/**
 * Cookie-authenticated state-changing requests are rejected by the CSRF origin guard
 * (`src/middlewares/csrf-origin-guard.middleware.ts`) unless they carry an allowed `Origin`.
 * Test fixtures must therefore send the same origin the test environment declares instead of a
 * second hardcoded literal, otherwise mutations fail with a misleading 403 that looks like RBAC.
 */
const resolveTestOrigin = (): string => {
  const [firstOrigin] = config.APP_ORIGIN;
  if (!firstOrigin) {
    throw new Error('APP_ORIGIN resolved to an empty list; cannot build a CSRF-safe Origin header');
  }
  return firstOrigin;
};

export const TEST_ORIGIN: string = resolveTestOrigin();

/**
 * Attaches cookie auth plus the allowed `Origin` to a mutating supertest request.
 * Only use this for POST/PUT/PATCH/DELETE — GET requests are exempt from the guard and must stay
 * untouched so that read assertions keep exercising the real client behaviour.
 */
export const authedMutation = (test: Test, cookie: string | string[]): Test => {
  test.set('Origin', TEST_ORIGIN);
  return Array.isArray(cookie) ? test.set('Cookie', cookie) : test.set('Cookie', cookie);
};
