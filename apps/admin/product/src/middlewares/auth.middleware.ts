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
    // Check for token in headers and cookies
    const authHeader = req.headers.authorization;
    let headerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;
    let cookieToken = req.cookies && req.cookies.accessToken;

    // Prefer header token if valid, else use cookie token
    let token = headerToken || cookieToken;

    logger.debug({
      headerToken,
      cookieToken,
      tokenUsed: token,
      cookies: req.cookies,
      headers: req.headers
    }, 'Token extraction details');

    if (!token) {
      logger.warn('No token provided');
      throw new UnauthorizedException('Authentication token is required', ErrorCode.AUTH_TOKEN_MISSING);
    }
      // Verify the token
    if (!config.JWT.SECRET) {
      logger.error('JWT_SECRET environment variable is not set');
      return next(new UnauthorizedException('Server authentication configuration error', ErrorCode.AUTH_TOKEN_INVALID));
    }
    
    logger.debug({ 
      tokenLength: token.length,
      jwtSecret: config.JWT.SECRET.substring(0, 3) + '...',
      tokenFirstChars: token.substring(0, 10) + '...',
      tokenPayload: JSON.stringify(decodeURIComponent(atob(token.split('.')[1] || '')))
    }, 'Verifying token');
      try {
      // Before verification, try to decode to see what's in the token
      let decoded: any;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const decodedPayload = Buffer.from(payload, 'base64').toString();
          decoded = JSON.parse(decodedPayload);
          logger.debug({ decodedPayload: decoded }, 'Pre-verification token payload');
        }
      } catch (decodeErr) {
        logger.warn({ error: decodeErr }, 'Failed to pre-decode token');
      }
      
      jwt.verify(token, config.JWT.SECRET, (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err) {
          logger.error({
            errorName: err.name,
            errorMessage: err.message,
            tokenUsed: token.substring(0, 20) + '...',
            jwtSecret: config.JWT.SECRET.substring(0, 5) + '...',
            decodedPayload: decoded
          }, 'JWT verification failed');
          // Handle different JWT errors
          if (err.name === 'TokenExpiredError') {
            logger.warn('Token expired');
            return next(new UnauthorizedException('Authentication token has expired', ErrorCode.AUTH_TOKEN_EXPIRED));
          } else {
            logger.warn({ error: err.message }, 'Invalid token');
            return next(new UnauthorizedException('Invalid authentication token', ErrorCode.AUTH_TOKEN_INVALID));
          }
        }      // Attach the user info to the request object
        req.user = decoded as JwtPayload;
        logger.debug({ userId: req.user.userId }, 'User authenticated');
        next();
      });
    } catch (error) {
      logger.error({ error }, 'Error in JWT validation process');
      next(error);
    }
  } catch (error) {
    logger.error({ error }, 'Unhandled error in auth middleware');
    next(error);
  }
};