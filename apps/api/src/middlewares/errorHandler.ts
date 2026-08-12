import { ErrorRequestHandler, Response } from 'express';
import { z } from 'zod';

import { IApiResponse } from '@celebs/shared-types';
import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { clearAuthenticationCookies, REFRESH_PATH } from '@/common/utils/cookie';

const formatZodError = (res: Response, error: z.ZodError) => {
  const issues = Array.isArray(error?.issues) ? error.issues : [];
  const errors =
    issues.length > 0
      ? issues.map((err) => ({
          field: Array.isArray(err?.path) ? err.path.join('.') : '',
          message: err?.message || 'Validation error',
        }))
      : [{ message: (error as unknown as Error)?.message || 'Validation failed' }];

  const response: IApiResponse = {
    success: false,
    message: 'Validation failed',
    errors: errors,
    data: null,
    errorCode: ErrorCode.VALIDATION_ERROR,
  };

  return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next): Response | void => {
  try {
    // Log error details safely on server side
    console.error(
      `Error occurred on PATH: ${req.path} - ${error?.name || 'Error'}: ${error?.message || error}`,
    );

    // Ensure response always uses JSON content type
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }

    if (req.path === REFRESH_PATH) {
      clearAuthenticationCookies(res);
    }

    // Branch 1: SyntaxError (Invalid JSON body formatting from Express body-parser)
    if (error instanceof SyntaxError && (error as { status?: number })?.status === 400) {
      const response: IApiResponse = {
        success: false,
        message: 'Invalid JSON format, please check your request body',
        data: null,
        errorCode: ErrorCode.INVALID_JSON_FORMAT,
      };
      return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
    }

    // Branch 2: ZodError (Schema validation failure)
    if (
      error instanceof z.ZodError ||
      error?.name === 'ZodError' ||
      error?.constructor?.name === 'ZodError' ||
      Array.isArray((error as unknown as Record<string, unknown>)?.issues)
    ) {
      return formatZodError(res, error as z.ZodError);
    }

    // Branch 3: AppError & Custom Domain Exceptions (BadRequest, Unauthorized, Forbidden, NotFound, Conflict)
    if (
      error instanceof AppError ||
      (typeof (error as unknown as Record<string, unknown>)?.statusCode === 'number' &&
        (error as unknown as Record<string, unknown>)?.errorCode)
    ) {
      const errObj = error as unknown as Record<string, unknown>;
      const statusCode = (errObj.statusCode as number) || HTTPSTATUS.INTERNAL_SERVER_ERROR;
      const response: IApiResponse = {
        success: false,
        message: (errObj.message as string) || 'An error occurred',
        errorCode: errObj.errorCode as ErrorCode,
        data: null,
      };
      return res.status(statusCode).json(response);
    }

    // Branch 4: Unknown / Unexpected Internal Errors
    const response: IApiResponse = {
      success: false,
      message: 'Internal Server Error',
      data: null,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    };
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json(response);
  } catch (fatalErr) {
    console.error('Fatal error within errorHandler middleware:', fatalErr);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal Server Error',
        data: null,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      });
    }
  }
};
