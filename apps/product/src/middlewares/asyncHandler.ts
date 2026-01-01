import { Request, Response, NextFunction } from 'express';
import { RequestHandler } from 'express';

// Middleware for handling async routes without try-catch
export const asyncHandler = (fn: RequestHandler) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};