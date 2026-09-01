import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { BadRequestException, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import { errorHandler } from '../error-handler';

describe('errorHandler Middleware Unit Tests', () => {
  const mockRequest = (path = '/test') =>
    ({
      path,
    }) as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.headersSent = false;
    res.setHeader = vi.fn().mockReturnValue(res);
    res.status = vi.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    });
    res.json = vi.fn().mockImplementation((payload) => payload);
    return res;
  };

  it('Branch 1: should handle SyntaxError (JSON body parsing) with status 400 and JSON format error', () => {
    const req = mockRequest('/api/v1/auth/login');
    const res = mockResponse();
    const error = Object.assign(new SyntaxError('Unexpected token in JSON'), { status: 400 });

    errorHandler(error, req, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid JSON format, please check your request body',
        data: null,
        errorCode: ErrorCode.INVALID_JSON_FORMAT,
      }),
    );
  });

  it('Branch 2: should handle ZodError with status 400 and structured validation errors', () => {
    const req = mockRequest('/api/v1/auth/register');
    const res = mockResponse();

    const dummySchema = z.object({
      email: z.string().email(),
    });

    let zodErr: z.ZodError | null = null;
    try {
      dummySchema.parse({ email: 'not-an-email' });
    } catch (err: unknown) {
      zodErr = err as z.ZodError;
    }

    errorHandler(zodErr!, req, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Invalid email',
        errors: [{ field: 'email', message: 'Invalid email' }],
        data: null,
        errorCode: ErrorCode.VALIDATION_ERROR,
      }),
    );
  });

  it('Branch 3: should handle AppError (e.g. BadRequestException) with custom status code and errorCode', () => {
    const req = mockRequest('/api/v1/category/123');
    const res = mockResponse();
    const error = new BadRequestException('Category name required', ErrorCode.VALIDATION_ERROR);

    errorHandler(error, req, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Category name required',
        errorCode: ErrorCode.VALIDATION_ERROR,
        data: null,
      }),
    );
  });

  it('Branch 4: should handle unknown internal errors with status 500 without leaking stack traces', () => {
    const req = mockRequest('/api/v1/unknown');
    const res = mockResponse();
    const error = new Error('Database connection failed unexpectedly');

    errorHandler(error, req, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.status).toHaveBeenCalledWith(HTTPSTATUS.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal Server Error',
        data: null,
        errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      }),
    );
  });
});
