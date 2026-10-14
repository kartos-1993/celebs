import { NextFunction, Request, Response } from 'express';

export interface PublicCacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  swr?: number;
}

/**
 * Declarative route-level middleware for public edge-cacheable reads.
 * Appends Cache-Control with optional s-maxage and stale-while-revalidate directives,
 * and sets Vary: Accept-Encoding to prevent proxy encoding compression mismatch.
 */
export const publicCache = (options: PublicCacheOptions = {}) => {
  const { maxAge = 60, sMaxAge, swr } = options;
  const parts: string[] = ['public', `max-age=${maxAge}`];

  if (typeof sMaxAge === 'number') {
    parts.push(`s-maxage=${sMaxAge}`);
  }
  if (typeof swr === 'number') {
    parts.push(`stale-while-revalidate=${swr}`);
  }

  const cacheControlValue = parts.join(', ');

  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', cacheControlValue);

    const existingVary = res.getHeader('Vary');
    if (!existingVary) {
      res.setHeader('Vary', 'Accept-Encoding');
    } else if (typeof existingVary === 'string' && !existingVary.includes('Accept-Encoding')) {
      res.setHeader('Vary', `${existingVary}, Accept-Encoding`);
    }

    next();
  };
};

/**
 * Declarative route-level middleware for strictly private, un-cached reads.
 * Appends Cache-Control: private, no-store, no-cache, must-revalidate and Pragma: no-cache.
 */
export const privateNoStore =
  () =>
  (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    next();
  };
