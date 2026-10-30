import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { csrfOriginGuard, EXEMPT_PATHS, PUBLIC_AUTH_PATHS } from '../csrf-origin-guard.middleware';

describe('CSRF Origin Guard Middleware Contract', () => {
  it('exports canonical exempt paths matching live payment callback and logistics webhook routes', () => {
    expect(EXEMPT_PATHS).toContain('/api/v1/orders/payments/esewa/success');
    expect(EXEMPT_PATHS).toContain('/api/v1/orders/payments/esewa/failure');
    expect(EXEMPT_PATHS).toContain('/api/v1/orders/payments/khalti/return');
    expect(EXEMPT_PATHS).toContain('/api/v1/logistics/webhook');
  });

  it('exports public auth paths matching authentication and onboarding endpoints', () => {
    expect(PUBLIC_AUTH_PATHS).toContain('/api/v1/auth/login');
    expect(PUBLIC_AUTH_PATHS).toContain('/api/v1/auth/register');
    expect(PUBLIC_AUTH_PATHS).toContain('/api/v1/auth/vendor/register');
    expect(PUBLIC_AUTH_PATHS).toContain('/api/v1/auth/google');
    expect(PUBLIC_AUTH_PATHS).toContain('/api/v1/auth/forgot-password');
    expect(PUBLIC_AUTH_PATHS).toContain('/api/v1/auth/reset-password');
  });

  it('allows safe read-only methods regardless of origin or cookie state', () => {
    const req = {
      method: 'GET',
      path: '/api/v1/products',
      cookies: { accessToken: 'cookie-val' },
      headers: { origin: 'https://untrusted-site.com' },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    csrfOriginGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows exempted webhook paths even when ambient cookies are present with null origin', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/logistics/webhook',
      cookies: { accessToken: 'cookie-val' },
      headers: {},
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    csrfOriginGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks state-changing requests with untrusted origin even on public auth routes', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/auth/login',
      cookies: {},
      headers: {
        origin: 'https://malicious-attacker.com',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    expect(() => csrfOriginGuard(req, res, next)).toThrowError(
      'Cross-site request blocked: unauthorized origin',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests with whitelisted origin on state-changing routes', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      cookies: { accessToken: 'cookie-val' },
      headers: {
        origin: 'http://localhost:3000',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    csrfOriginGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows non-browser requests with null origin on public auth routes', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/auth/login',
      cookies: { accessToken: 'stale-cookie-val' },
      headers: {},
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    csrfOriginGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows non-browser requests with authorization bearer header even when ambient cookies are present', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      cookies: { accessToken: 'stale-cookie-val' },
      headers: {
        authorization: 'Bearer token-12345',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    csrfOriginGuard(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects cookie-carrying requests lacking origin on non-exempt mutating routes', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      cookies: { accessToken: 'cookie-val' },
      headers: {},
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    expect(() => csrfOriginGuard(req, res, next)).toThrowError(
      'Cross-site request blocked: missing origin header for cookie-authenticated request',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks requests carrying sec-fetch-site cross-site header', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/auth/login',
      cookies: {},
      headers: {
        'sec-fetch-site': 'cross-site',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    expect(() => csrfOriginGuard(req, res, next)).toThrowError(
      'Cross-site request blocked via fetch metadata',
    );
    expect(next).not.toHaveBeenCalled();
  });
});
