import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/utils/AppError';
import { HTTPSTATUS } from '../config/http.config';
import { ErrorCode } from '../common/enums/error-code.enum';
import { logger } from '../common/utils/logger';

// Interface for standardized API responses
interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  errorCode?: ErrorCode;
}

// Format ZodError for user-friendly validation error responses
const formatZodError = (res: Response, error: ZodError) => {
  const formattedErrors = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  const response: IApiResponse = {
    success: false,
    message: 'Validation error',
    data: formattedErrors,
    errorCode: ErrorCode.VALIDATION_ERROR,
  };

  return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
};

// Global error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error for debugging
  logger.error(`Error occurred on PATH: ${req.path}`, error);

  // Set content type to ensure JSON response
  res.setHeader('Content-Type', 'application/json');

  if (error instanceof SyntaxError) {
    const response: IApiResponse = {
      success: false,
      message: 'Invalid JSON format, please check your request body',
      data: null,
      errorCode: ErrorCode.INVALID_REQUEST,
    };
    return res.status(HTTPSTATUS.BAD_REQUEST).json(response);
  }

  if (error instanceof ZodError) {
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
  // Default error response for unhandled errors
  logger.error({
    path: req.path,
    method: req.method,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    body: req.body
  }, 'Unhandled error occurred');
  
  const response: IApiResponse = {
    success: false,
    message: 'Internal server error',
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    data: null,
  };
  
  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json(response);
};