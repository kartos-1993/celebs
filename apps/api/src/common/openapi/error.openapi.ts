import { z } from 'zod';

import { registry } from './registry';

// ── Reusable Error Schemas ──

export const ApiErrorResponseSchema = registry.register(
  'ApiErrorResponse',
  z.object({
    success: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: 'An error occurred during request processing' }),
    errorCode: z.string().optional().openapi({ example: 'AUTH_UNAUTHORIZED_ACCESS' }),
    data: z.null().openapi({ example: null }),
    requestId: z.string().optional().openapi({ example: '9df3fd3f-ba86-4961-8720-d3331e9d2ef2' }),
    timestamp: z.string().datetime().openapi({ example: '2026-08-30T16:00:00.000Z' }),
  }),
);

export const ValidationErrorResponseSchema = registry.register(
  'ValidationErrorResponse',
  z.object({
    success: z.literal(false).openapi({ example: false }),
    message: z.string().openapi({ example: 'Validation failed' }),
    errorCode: z.literal('VALIDATION_ERROR').openapi({ example: 'VALIDATION_ERROR' }),
    errors: z
      .array(
        z.object({
          field: z.string().openapi({ example: 'fieldName' }),
          message: z
            .string()
            .openapi({ example: 'Field constraint violation message (e.g. "Required")' }),
        }),
      )
      .openapi({
        example: [{ field: 'fieldName', message: 'Field validation error message' }],
      }),
    data: z.null().openapi({ example: null }),
    requestId: z.string().optional().openapi({ example: '9df3fd3f-ba86-4961-8720-d3331e9d2ef2' }),
    timestamp: z.string().datetime().openapi({ example: '2026-08-30T16:00:00.000Z' }),
  }),
);

// ── Preset Response Definitions ──

export const commonErrors = {
  badRequest: {
    400: {
      description: 'Bad Request / Validation Failure',
      content: {
        'application/json': {
          schema: ValidationErrorResponseSchema,
        },
      },
    },
  },
  unauthorized: {
    401: {
      description: 'Unauthorized (Missing, invalid, or expired authentication token)',
      content: {
        'application/json': {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
  forbidden: {
    403: {
      description: 'Forbidden (Insufficient permissions, unapproved store, or suspended account)',
      content: {
        'application/json': {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
  notFound: {
    404: {
      description: 'Resource or endpoint not found',
      content: {
        'application/json': {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
  serverError: {
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: ApiErrorResponseSchema,
        },
      },
    },
  },
};

/**
 * Helper to spread standard JSON error responses into OpenAPI path definitions.
 * Example: `...withErrors(400, 401, 403, 404)`
 */
export function withErrors(...statusCodes: (400 | 401 | 403 | 404 | 500)[]) {
  const result: Record<number, unknown> = {};
  for (const code of statusCodes) {
    if (code === 400) Object.assign(result, commonErrors.badRequest);
    if (code === 401) Object.assign(result, commonErrors.unauthorized);
    if (code === 403) Object.assign(result, commonErrors.forbidden);
    if (code === 404) Object.assign(result, commonErrors.notFound);
    if (code === 500) Object.assign(result, commonErrors.serverError);
  }
  return result;
}
