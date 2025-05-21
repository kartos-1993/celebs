import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/app.config';
import { UnauthorizedException } from '../common/utils/catch-errors';
import { ErrorCode } from '../common/enums/error-code.enum';
import { logger } from '../common/utils/logger';

interface JwtPayload {
  userId: string;
  sessionId: string;
}

// Extend Express Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        sessionId: string;
      };
    }
  }
}

// Middleware to authenticate JWT tokens
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for token in headers
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('No token provided');
      throw new UnauthorizedException('Authentication token is required', ErrorCode.AUTH_TOKEN_MISSING);
    }

    // Verify the token
    jwt.verify(token, config.JWT.SECRET, (err, decoded) => {
      if (err) {
        // Handle different JWT errors
        if (err.name === 'TokenExpiredError') {
          logger.warn('Token expired');
          throw new UnauthorizedException('Authentication token has expired', ErrorCode.AUTH_TOKEN_EXPIRED);
        } else {
          logger.warn('Invalid token');
          throw new UnauthorizedException('Invalid authentication token', ErrorCode.AUTH_TOKEN_INVALID);
        }
      }

      // Attach the user info to the request object
      req.user = decoded as JwtPayload;
      next();
    });
  } catch (error) {
    next(error);
  }
};