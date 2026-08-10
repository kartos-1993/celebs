import { z } from 'zod';
import { ErrorRequestHandler, Response } from 'express';
import { HTTPSTATUS, AppError, ErrorCode } from '@celebs/shared-utils';
import { clearAuthenticationCookies, REFRESH_PATH } from '@/common/utils/cookie';
import { IApiResponse } from '@celebs/shared-types';

const formatZodError = (res: Response, error: z.ZodError) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  const response: IApiResponse = {
    success: false,
    message: 'Validation failed',
    errors: errors,
    data: null,
    errorCode: ErrorCode.VALIDATION_ERROR,
  };

  return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next): any => {
  try {
    console.error(`Error occured on PATH: ${req.path}`, error);
  } catch (e) {
    console.error(
      `Error occured on PATH: ${req.path} (Failed to inspect error object):`,
      error?.message || error,
    );
  }

  // Set content type to ensure JSON response
  res.setHeader('Content-Type', 'application/json');

  if (req.path === REFRESH_PATH) {
    clearAuthenticationCookies(res);
  }

  if (error instanceof SyntaxError) {
    const response: IApiResponse = {
      success: false,
      message: 'Invalid JSON format, please check your request body',
      data: null,
      errorCode: ErrorCode.INVALID_JSON_FORMAT,
    };
    return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
  }

  if (error instanceof z.ZodError) {
    return formatZodError(res, error);
  }

  if (error instanceof AppError) {
    const response: IApiResponse = {
      success: false,
      message: error.message,
      errorCode: error.errorCode,
      data: null,
    };
    return res.status(error.statusCode).json(response);
  }
  // Check for ZodError in error.name as a fallback (for cases where instanceof doesn't work)
  if (error?.name === 'ZodError' || error?.constructor?.name === 'ZodError') {
    const zodError = error as z.ZodError;
    const errors = zodError?.issues?.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })) || [{ message: 'Validation error' }];

    const response: IApiResponse = {
      success: false,
      message: 'Validation failed',
      errors: errors,
      data: null,
      errorCode: ErrorCode.VALIDATION_ERROR,
    };

    return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
  }

  // For unexpected errors
  const response: IApiResponse = {
    success: false,
    message: 'Internal Server Error',
    errors: [{ message: error?.message || 'Unknown error occurred' }],
    data: null,
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
  };

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json(response);
};
