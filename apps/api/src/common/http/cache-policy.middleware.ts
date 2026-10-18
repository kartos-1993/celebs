import { NextFunction, Request, Response } from 'express';

export interface PublicCacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  swr?: number;
}

/**
 * True when the request carries credentials, so its response must never be
 * stored by a shared cache. In the live pipeline this middleware runs after
 * cookieParser and the optional auth/actor middlewares; the Authorization and
 * cookie fallbacks keep it fail-safe even when mounted before them.
 */
function isCredentialedRequest(req: Request): boolean {
  if (req.actor || req.user) {
    return true;
  }
  if (typeof req.headers.authorization === 'string' && req.headers.authorization.length > 0) {
    return true;
  }
  const cookies = req.cookies as Record<string, unknown> | undefined;
  return Boolean(cookies?.accessToken || cookies?.refreshToken);
}

/** Merge values into the existing Vary header without duplicating entries. */
function appendVary(res: Response, values: string[]): void {
  const existing = res.getHeader('Vary');
  const current =
    typeof existing === 'string'
      ? existing
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
  const merged = [...current];
  for (const value of values) {
    if (!merged.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
      merged.push(value);
    }
  }
  res.setHeader('Vary', merged.join(', '));
}

function applyPrivateNoStore(res: Response): void {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
}

/**
 * Declarative route-level middleware for public edge-cacheable reads.
 *
 * Anonymous requests get the configured `public` policy. Credentialed requests
 * (resolved actor/user, bearer header, or auth cookies) are downgraded to
 * `private, no-store` — elevated list/detail payloads must never be stored or
 * shared by an edge cache. Public responses vary on Authorization and
 * X-Surface so a stored anonymous entry can never be replayed to a
 * credentialed or admin-surface caller.
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

  return (req: Request, res: Response, next: NextFunction): void => {
    if (isCredentialedRequest(req)) {
      applyPrivateNoStore(res);
      next();
      return;
    }

    res.setHeader('Cache-Control', cacheControlValue);
    appendVary(res, ['Accept-Encoding', 'Authorization', 'X-Surface']);
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
    applyPrivateNoStore(res);
    next();
  };
