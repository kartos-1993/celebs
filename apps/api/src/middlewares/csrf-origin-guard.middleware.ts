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
  '/api/v1/auth/vendor/register',
  '/api/v1/auth/google',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
];

export const csrfOriginGuard = (req: Request, _res: Response, next: NextFunction): void => {
  // 1. Safe read-only methods
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // 2. Cryptographically signed external webhook exemptions (HMAC)
  if (EXEMPT_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // 3. Extract and normalize origin information
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin: string | null = null;
  if (typeof originHeader === 'string' && originHeader.trim() !== '') {
    requestOrigin = originHeader.trim();
  } else if (typeof refererHeader === 'string' && refererHeader.trim() !== '') {
    try {
      requestOrigin = new URL(refererHeader).origin;
    } catch {
      requestOrigin = null;
    }
  }

  // 4. Critical: If an Origin is present, it MUST match the allowed origins list.
  // This completely eliminates Login CSRF on public auth endpoints.
  if (requestOrigin && !isAllowedOrigin(requestOrigin, allowedOriginsList)) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        origin: requestOrigin,
        allowedOrigins: allowedOriginsList,
      },
      'CSRF origin guard blocked untrusted browser origin',
    );
    throw new ForbiddenException(
      'Cross-site request blocked: unauthorized origin',
      ErrorCode.FORBIDDEN_ACCESS,
    );
  }

  // 5. Block explicit browser cross-site metadata flag
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    throw new ForbiddenException(
      'Cross-site request blocked via fetch metadata',
      ErrorCode.FORBIDDEN_ACCESS,
    );
  }

  // 6. Check for ambient credentials vs explicit Bearer / token headers
  const hasAuthCookie = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
  const hasBearerHeader = Boolean(req.headers.authorization?.startsWith('Bearer '));
  const hasHeaderRefreshToken = Boolean(req.headers['x-refresh-token']);

  // If request uses Bearer auth, explicit token headers, or has no cookies, ambient CSRF is impossible
  if (!hasAuthCookie || hasBearerHeader || hasHeaderRefreshToken) {
    return next();
  }

  // 7. Ambient cookie request carrying a verified allowed origin
  if (requestOrigin) {
    return next();
  }

  // 8. Ambient cookies present without Origin:
  // Allow strictly public credential handshakes from non-browser clients
  const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => req.path.startsWith(path));
  if (isPublicAuth) {
    return next();
  }

  // 9. Reject state-changing cookie requests lacking valid Origin
  logger.warn(
    { path: req.path, method: req.method, origin: requestOrigin },
    'CSRF origin guard blocked ambient credential request missing valid origin',
  );
  throw new ForbiddenException(
    'Cross-site request blocked: missing origin header for cookie-authenticated request',
    ErrorCode.FORBIDDEN_ACCESS,
  );
};
