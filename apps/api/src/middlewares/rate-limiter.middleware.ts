import rateLimit from 'express-rate-limit';

// Standard error payload for rate limit responses
const standardRateLimitMessage = {
  success: false,
  message: 'Too many requests, please try again later.',
  errorCode: 'TOO_MANY_REQUESTS',
};

// Helper to allow rate limit testing when x-test-rate-limit header is present
const shouldSkipRateLimit = (req: any) => {
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
    return true;
  }
  return false;
};

/**
 * Strict Rate Limiter for Authentication & Sensitive Endpoints
 * (Login, Registration, Password Resets, Email Verification)
 * Limit: 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => shouldSkipRateLimit(req) || !!req.user,
  message: standardRateLimitMessage,
});

/**
 * File & Media Upload Endpoint Rate Limiter
 * Limit: 30 requests per 1 minute per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
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
