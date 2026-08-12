import { Request } from 'express';
import rateLimit from 'express-rate-limit';

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
  skip: (req: Request) => shouldSkipRateLimit(req) || !!req.user,
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
