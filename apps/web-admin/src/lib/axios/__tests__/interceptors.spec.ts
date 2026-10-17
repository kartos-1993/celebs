import axios, { AxiosError } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_BYPASS_URLS, setupInterceptors } from '../interceptors';

describe('Web-Admin Axios Interceptors Authentication Bypass', () => {
  it('contains live backend authentication routes and omits legacy mismatched route names', () => {
    // Must match actual backend endpoints in apps/api/src/modules/auth/auth.routes.ts
    expect(AUTH_BYPASS_URLS).toContain('/auth/forgot-password');
    expect(AUTH_BYPASS_URLS).toContain('/auth/reset-password');
    expect(AUTH_BYPASS_URLS).toContain('/auth/vendor/register');

    // Must not retain stale typos that prevent 401 bypass matching
    expect(AUTH_BYPASS_URLS).not.toContain('/auth/password-forgot');
    expect(AUTH_BYPASS_URLS).not.toContain('/auth/password-reset');
    expect(AUTH_BYPASS_URLS).not.toContain('/auth/setup-admin');
  });

  it('does not trigger a session refresh attempt when a 401 is received from forgot-password', async () => {
    const testClient = axios.create({ baseURL: 'http://localhost:3333/api/v1' });
    setupInterceptors(testClient);

    const postSpy = vi.spyOn(testClient, 'post');

    testClient.defaults.adapter = async (config) => {
      const err = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: {
          success: false,
          message: 'Invalid email or reset token',
          errorCode: 'INVALID_CREDENTIALS',
        },
      });
      return Promise.reject(err);
    };

    try {
      await testClient.post('/auth/forgot-password', { email: 'nonexistent@example.com' });
    } catch {
      // expected error
    }

    // Must NOT attempt to refresh token on a public auth bypass endpoint
    expect(postSpy).not.toHaveBeenCalledWith('/auth/refresh', expect.anything(), expect.anything());
  });
});
