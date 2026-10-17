import { NextFunction, Request, Response } from 'express';

import { ErrorCode, ForbiddenException, logger } from '@celebs/shared-utils';

import { config } from '@/config/app.config';

const allowedOriginsList = Array.isArray(config.APP_ORIGIN)
  ? config.APP_ORIGIN
  : [config.APP_ORIGIN];

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOriginsList.includes(origin)) {
    return true;
  }
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
      origin,
    );
  }
  return false;
};

// Safe HTTP methods that do not modify state
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Paths exempted from CSRF Origin check (e.g. gateway callbacks/webhooks with HMAC signatures)
const EXEMPT_PATHS = [
  '/api/v1/orders/payment/esewa/callback',
  '/api/v1/orders/payment/khalti/callback',
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
