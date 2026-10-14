import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { createHash } from 'node:crypto';

// Standard error payload for rate limit responses
const standardRateLimitMessage = {
  success: false,
  message: 'Too many requests, please try again later.',
  errorCode: 'TOO_MANY_REQUESTS',
};

// Secure helper to allow rate limit bypass ONLY during verified local test runner executions
const shouldSkipRateLimit = (req: Request) => {
  if (req?.headers?.['x-test-rate-limit'] === 'true') {
    return false;
  }
  return process.env.NODE_ENV === 'test';
};

/**
 * Strict Rate Limiter for High-Risk Credential & Identity Endpoints
 * (Login, Registration, Password Resets)
 * Limit: 10 requests per 15 minutes per IP
 */
export const credentialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: standardRateLimitMessage,
});

/**
 * Backward-compatible alias for credentialRateLimiter
 */
export const authRateLimiter = credentialRateLimiter;

/**
 * Session Refresh Rate Limiter
 * (Token Refresh, Silent Tab Refreshes, Email Verification)
 * Limit: 60 requests per 15 minutes per session/token
 * Eliminates cross-tab refresh starvation and prevents brute-force login attempts
 * from locking out existing user sessions sharing the same NAT IP.
 */
export const sessionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req: Request) => {
    // 1. If refresh token is in cookie
    const cookieToken = req.cookies?.refreshToken;
    if (cookieToken && typeof cookieToken === 'string') {
      const hash = createHash('sha256').update(cookieToken.trim()).digest('hex');
      return `session:${hash}`;
    }
    // 2. If refresh token is in header
    const headerToken = req.headers?.['x-refresh-token'];
    if (headerToken && typeof headerToken === 'string') {
      const hash = createHash('sha256').update(headerToken.trim()).digest('hex');
      return `session:${hash}`;
    }
    // 3. Fallback to IP
    return req.ip || 'anonymous';
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: standardRateLimitMessage,
});

/**
 * Storefront & Search Endpoint Rate Limiter
 * Limit: 300 requests per 1 minute per IP (Skips authenticated users)
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req: Request) => (req.user ? 600 : 300),
  keyGenerator: (req: Request) => (req.user?.id ? `user:${req.user.id}` : req.ip || 'anonymous'),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => shouldSkipRateLimit(req),
  message: standardRateLimitMessage,
});

/**
 * File & Media Upload Endpoint Rate Limiter
 * Limit: 30 requests per 1 minute per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const tokenHash = createHash('sha256').update(token).digest('hex');
      return `token:${tokenHash}`;
    }
    return req.ip || 'anonymous';
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: standardRateLimitMessage,
});

/**
 * Global Fallback API Rate Limiter
 * Limit: 10,000 requests per 15 minutes
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  message: standardRateLimitMessage,
});
