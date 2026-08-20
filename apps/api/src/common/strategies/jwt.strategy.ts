import passport, { PassportStatic } from 'passport';
import { ExtractJwt, Strategy as JwtStrategy, StrategyOptionsWithRequest } from 'passport-jwt';

import { ErrorCode, UnauthorizedException } from '@celebs/shared-utils';

import { config } from '@/config/app.config';
import prisma from '@/db';
import { UserService } from '@/modules/user/user.service';

const userService = new UserService();

interface JwtPayload {
  userId: string;
  sessionId: string;
}

const options: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      // 1. Try to extract from Authorization: Bearer <token> header (Mobile)
      const bearerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (bearerToken) {
        return bearerToken;
      }

      // 2. Fallback to HTTP-only Cookie (Web)
      const cookieToken = req.cookies?.accessToken;
      if (cookieToken) {
        return cookieToken;
      }

      return null;
    },
  ]),

  secretOrKey: config.JWT.SECRET,
  audience: ['user'],
  algorithms: ['HS256'],
  passReqToCallback: true,
};

export const setupJwtStrategy = (passport: PassportStatic) => {
  passport.use(
    new JwtStrategy(options, async (req, payload: JwtPayload, done) => {
      try {
        // Validate session exists in database and has not expired
        const session = await prisma.session.findUnique({
          where: { id: payload.sessionId },
        });
        if (!session || (session.expiredAt && session.expiredAt <= new Date())) {
          return done(
            new UnauthorizedException(
              'Session expired or invalid',
              ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
            ),
            false,
          );
        }

        const user = await userService.findUserById(payload.userId);
        if (!user) {
          return done(
            new UnauthorizedException('User not found', ErrorCode.AUTH_USER_NOT_FOUND),
            false,
          );
        }

        // Check if user is a vendor and status is suspended
        if (user.role === 'VENDOR' && user.vendorProfile) {
          const status = user.vendorProfile.status;
          if (status === 'SUSPENDED') {
            return done(
              new UnauthorizedException(
                'Access denied: Seller account is suspended.',
                ErrorCode.FORBIDDEN_ACCESS,
              ),
              false,
            );
          }
        }

        req.sessionId = payload.sessionId;
        // Map userId and sessionId for compatibility with product modules
        const mappedUser = {
          ...user,
          userId: user.id,
          sessionId: payload.sessionId,
        };
        return done(null, mappedUser);
      } catch (error) {
        return done(error, false);
      }
    }),
  );
};

import { NextFunction, Request, Response } from 'express';

export const authenticateJWT = passport.authenticate('jwt', { session: false });

export const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (_err: unknown, user: Express.User | false) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};
