import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { csrfOriginGuard, EXEMPT_PATHS } from '../csrf-origin-guard.middleware';

describe('CSRF Origin Guard Middleware Contract', () => {
  it('exports canonical exempt paths matching live payment callback and logistics webhook routes', () => {
    expect(EXEMPT_PATHS).toContain('/api/v1/orders/payments/esewa/success');
    expect(EXEMPT_PATHS).toContain('/api/v1/orders/payments/esewa/failure');
    expect(EXEMPT_PATHS).toContain('/api/v1/orders/payments/khalti/return');
    expect(EXEMPT_PATHS).toContain('/api/v1/logistics/webhook');
  });

  it('allows exempted webhook paths even when ambient cookies are present with no origin header', () => {
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

  it('blocks state-changing mutations when ambient cookies are present and origin is missing or untrusted', () => {
    const req = {
      method: 'POST',
      path: '/api/v1/orders',
      cookies: { accessToken: 'cookie-val' },
      headers: {
        origin: 'https://malicious-attacker.com',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    expect(() => csrfOriginGuard(req, res, next)).toThrowError();
    expect(next).not.toHaveBeenCalled();
  });
});
