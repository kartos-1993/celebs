import { Response } from 'express';

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
