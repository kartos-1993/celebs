import { Response } from 'express';

export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any> | Array<any>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
  meta?: Omit<NonNullable<ApiResponseEnvelope['meta']>, 'timestamp'>,
) => {
  const payload: ApiResponseEnvelope<T> = {
    success: true,
    message,
    data,
    meta: meta ? { ...meta, timestamp: new Date().toISOString() } : undefined,
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any,
) => {
  const payload: ApiResponseEnvelope = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(payload);
};
