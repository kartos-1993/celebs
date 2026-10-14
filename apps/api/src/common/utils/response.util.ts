import { Request, Response } from 'express';
import { createHash } from 'node:crypto';

import { IApiResponse } from '@celebs/shared-types';

/**
 * Standardized success response envelope for all API endpoints.
 * Automatically injects X-Request-Id and ISO timestamp.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): Response {
  const rawRequestId =
    typeof res.getHeader === 'function' ? res.getHeader('X-Request-Id') : undefined;
  const requestId =
    typeof rawRequestId === 'string'
      ? rawRequestId
      : Array.isArray(rawRequestId)
        ? rawRequestId[0]
        : undefined;

  const payload: IApiResponse<T> = {
    success: true,
    message,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(payload);
}

/**
 * Standardized 201 Created response helper.
 */
export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): Response {
  return sendSuccess(res, data, message, 201);
}

/**
 * Standardized response helper for sensitive, user-private reads (cart, orders, notifications, finance).
 * Stamps strict Cache-Control: private, no-store, no-cache, must-revalidate and Pragma: no-cache.
 */
export function sendPrivateUncached<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): Response {
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  return sendSuccess(res, data, message, statusCode);
}

export interface PublicCacheETagOptions {
  maxAge?: number;
  sMaxAge?: number;
  swr?: number;
}

/**
 * Standardized response helper for public cached reads with stable data-derived RFC 9110 quoted ETags.
 * Supports conditional GET revalidation (HTTP 304 Not Modified).
 */
export function sendPublicCachedWithETag<T>(
  req: Request,
  res: Response,
  data: T,
  options: PublicCacheETagOptions = {},
  message = 'Success',
): Response | void {
  const { maxAge = 60, sMaxAge, swr } = options;

  const canonicalData = JSON.stringify(data);
  const hash = createHash('sha1').update(canonicalData).digest('hex').slice(0, 27);
  const etag = `"${hash}"`;

  const parts: string[] = ['public', `max-age=${maxAge}`];
  if (typeof sMaxAge === 'number') parts.push(`s-maxage=${sMaxAge}`);
  if (typeof swr === 'number') parts.push(`stale-while-revalidate=${swr}`);

  res.setHeader('Cache-Control', parts.join(', '));
  res.setHeader('ETag', etag);

  const existingVary = res.getHeader('Vary');
  if (!existingVary) {
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (typeof existingVary === 'string' && !existingVary.includes('Accept-Encoding')) {
    res.setHeader('Vary', `${existingVary}, Accept-Encoding`);
  }

  const clientETag = req.headers['if-none-match'];
  if (
    clientETag &&
    (clientETag === etag ||
      clientETag === `W/${etag}` ||
      clientETag === hash ||
      clientETag === `"${hash}"`)
  ) {
    return res.status(304).end();
  }

  return sendSuccess(res, data, message);
}

/**
 * Standardized paginated response envelope.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { page: number; limit: number; total: number },
  message = 'Success',
): Response {
  const rawRequestId =
    typeof res.getHeader === 'function' ? res.getHeader('X-Request-Id') : undefined;
  const requestId =
    typeof rawRequestId === 'string'
      ? rawRequestId
      : Array.isArray(rawRequestId)
        ? rawRequestId[0]
        : undefined;

  const totalPages = Math.ceil(pagination.total / (pagination.limit || 1));

  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
    },
    requestId,
    timestamp: new Date().toISOString(),
  });
}
