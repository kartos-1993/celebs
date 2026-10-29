import { NextFunction, Request, Response } from 'express';

import { ErrorCode, ForbiddenException, logger } from '@celebs/shared-utils';

import { isAllowedOrigin } from '@/common/http/origin.util';
import { config } from '@/config/app.config';

const allowedOriginsList = Array.isArray(config.APP_ORIGIN)
  ? config.APP_ORIGIN
  : [config.APP_ORIGIN];

// Safe HTTP methods that do not modify state
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths exempted from CSRF Origin check (e.g. gateway callbacks/webhooks with HMAC signatures)
export const EXEMPT_PATHS = [
  '/api/v1/orders/payments/esewa/success',
  '/api/v1/orders/payments/esewa/failure',
  '/api/v1/orders/payments/khalti/return',
  '/api/v1/logistics/webhook',
];

// Public authentication & onboarding handshakes:
// These authenticate strictly via payload credentials (email, password, OAuth idToken)
// to establish a NEW session. They never authorize state changes on behalf of an ambient cookie.
export const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/vendor-register',
  '/api/v1/auth/google',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
];

export const csrfOriginGuard = (req: Request, _res: Response, next: NextFunction): void => {
  // 1. Pass safe read-only methods
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // 2. Pass explicitly exempted webhook endpoints
  if (EXEMPT_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // 3. Pass public authentication credential handshakes
  if (PUBLIC_AUTH_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // 4. Native mobile surface requests (immune to browser cross-site ambient credential forgery)
  if (req.headers['x-surface'] === 'mobile') {
    return next();
  }

  // 3. Determine if the request relies on browser cookie authentication
  const hasAuthCookie = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  const hasBearerHeader = Boolean(req.headers.authorization?.startsWith('Bearer '));

  // If request does not rely on ambient cookies or explicitly provides Bearer auth
  // (mobile app or programmatic client), CSRF via ambient credentials is not applicable
  if (!hasAuthCookie || hasBearerHeader) {
    return next();
  }

  // 4. Request relies on ambient cookies: verify Origin / Referer
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin: string | null = null;
  if (typeof originHeader === 'string' && originHeader.trim() !== '') {
    requestOrigin = originHeader.trim();
  } else if (typeof refererHeader === 'string' && refererHeader.trim() !== '') {
    try {
      const parsedUrl = new URL(refererHeader);
      requestOrigin = parsedUrl.origin;
    } catch {
      requestOrigin = null;
    }
  }

  if (!requestOrigin || !isAllowedOrigin(requestOrigin)) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        origin: requestOrigin,
        allowedOrigins: allowedOriginsList,
      },
      'CSRF origin guard blocked cross-site state-changing request',
    );
    throw new ForbiddenException(
      'Cross-site request blocked: unauthorized or missing origin header',
      ErrorCode.FORBIDDEN_ACCESS,
    );
  }

  return next();
};
