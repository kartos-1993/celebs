import { ErrorRequestHandler, Response } from 'express';
import { z } from 'zod';

import { IApiResponse } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS, logger } from '@celebs/shared-utils';

import { clearAuthenticationCookies, REFRESH_PATH } from '@/common/utils/cookie';
import { Prisma } from '@/config/db.prisma';
import { captureSentryException } from '@/config/sentry';

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function buildErrorResponse(opts: {
  message: string;
  errorCode?: ErrorCode;
  errors?: Array<{ field?: string; message: string }>;
  requestId?: string;
}): IApiResponse {
  return {
    success: false,
    message: opts.message,
    errorCode: opts.errorCode,
    errors: opts.errors,
    data: null,
    requestId: opts.requestId,
    timestamp: new Date().toISOString(),
  };
}

const formatZodError = (res: Response, error: z.ZodError, requestId?: string) => {
  const issues = Array.isArray(error?.issues) ? error.issues : [];
  const errors =
    issues.length > 0
      ? issues.map((err) => ({
          field: Array.isArray(err?.path) ? err.path.join('.') : '',
          message: err?.message || 'Validation error',
        }))
      : [{ message: error instanceof Error ? error.message : 'Validation failed' }];

  const firstMessage = issues?.[0]?.message || 'Validation failed';

  const response = buildErrorResponse({
    message: firstMessage,
    errorCode: ErrorCode.VALIDATION_ERROR,
    errors,
    requestId,
  });

  return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next): Response | void => {
  try {
    const rawRequestId =
      typeof res.getHeader === 'function' ? res.getHeader('X-Request-Id') : undefined;
    const requestId =
      typeof rawRequestId === 'string'
        ? rawRequestId
        : Array.isArray(rawRequestId)
          ? rawRequestId[0]
          : undefined;

    // Structured log with request context; stack traces for unexpected errors only.
    const isExpected = error instanceof AppError;
    const logPayload = {
      requestId,
      path: req.path,
      method: req.method,
      name: error?.name || 'Error',
      message: error?.message || String(error),
      errorCode: isRecord(error) ? error.errorCode : undefined,
      ...(isExpected ? {} : { stack: error instanceof Error ? error.stack : undefined }),
    };
    if (isExpected) {
      logger.warn(logPayload, `Handled application error on PATH: ${req.path}`);
    } else {
      logger.error(logPayload, `Unhandled error on PATH: ${req.path}`);
      captureSentryException(error, { path: req.path, method: req.method });
    }

    // Ensure response always uses JSON content type
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }

    if (req.path === REFRESH_PATH) {
      clearAuthenticationCookies(res);
    }

    // Branch 1: SyntaxError (Invalid JSON body formatting from Express body-parser)
    if (error instanceof SyntaxError && (error as { status?: number })?.status === 400) {
      const response = buildErrorResponse({
        message: 'Invalid JSON format, please check your request body',
        errorCode: ErrorCode.INVALID_JSON_FORMAT,
        requestId,
      });
      return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
    }

    // Branch 2: ZodError (Schema validation failure)
    if (
      error instanceof z.ZodError ||
      error?.name === 'ZodError' ||
      error?.constructor?.name === 'ZodError' ||
      (isRecord(error) && Array.isArray(error.issues))
    ) {
      return formatZodError(res, error as z.ZodError, requestId);
    }

    // Branch 3: AppError & Custom Domain Exceptions (BadRequest, Unauthorized, Forbidden, NotFound, Conflict)
    if (error instanceof AppError) {
      const response = buildErrorResponse({
        message: error.message || 'An error occurred',
        errorCode: error.errorCode as ErrorCode,
        requestId,
      });
      return res.status(error.statusCode || HTTPSTATUS.INTERNAL_SERVER_ERROR).json(response);
    }

    if (isRecord(error) && typeof error.statusCode === 'number' && error.errorCode) {
      const statusCode = error.statusCode;
      const response = buildErrorResponse({
        message: typeof error.message === 'string' ? error.message : 'An error occurred',
        errorCode: error.errorCode as ErrorCode,
        requestId,
      });
      return res.status(statusCode).json(response);
    }

    // Branch 4: Prisma Known Request Errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const targetFields = error.meta?.target;
          let fieldName = 'field';
          if (Array.isArray(targetFields)) {
            fieldName = targetFields.join(', ');
          } else if (typeof targetFields === 'string') {
            fieldName = targetFields.replace(/_key$/, '').replace(/^.*_/, '');
          }
          const response = buildErrorResponse({
            message: `A record with this ${fieldName} already exists. Please use a unique value.`,
            errorCode: ErrorCode.VALIDATION_ERROR,
            requestId,
          });
          return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
        }
        case 'P2025': {
          const response = buildErrorResponse({
            message: 'The requested resource was not found',
            errorCode: ErrorCode.RESOURCE_NOT_FOUND,
            requestId,
          });
          return res.status(HTTPSTATUS.NOT_FOUND).json(response);
        }
        case 'P2003': {
          const response = buildErrorResponse({
            message: 'Invalid reference: The associated resource does not exist',
            errorCode: ErrorCode.INVALID_REQUEST,
            requestId,
          });
          return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
        }
        case 'P2014': {
          const response = buildErrorResponse({
            message: 'Cannot delete this item because it is referenced by active records',
            errorCode: ErrorCode.INVALID_REQUEST,
            requestId,
          });
          return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
        }
      }
    }

    // Branch 5: Unknown / Unexpected Internal Errors
    const response = buildErrorResponse({
      message: 'Internal Server Error',
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      requestId,
    });
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json(response);
  } catch (fatalErr) {
    logger.error({ err: fatalErr }, 'Fatal error within errorHandler middleware');
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json(
        buildErrorResponse({
          message: 'Internal Server Error',
          errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
        }),
      );
    }
  }
};
