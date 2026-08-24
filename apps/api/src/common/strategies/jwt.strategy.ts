import passport, { PassportStatic } from 'passport';
import { ExtractJwt, Strategy as JwtStrategy, StrategyOptionsWithRequest } from 'passport-jwt';

import { ErrorCode, UnauthorizedException } from '@celebs/shared-utils';

import { config } from '@/config/app.config';
import prisma from '@/config/db.prisma';
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
        // Parallel: both lookups key off the JWT payload — no data dependency.
        // This is the hottest query pair in the app (every authenticated request).
        const [session, user] = await Promise.all([
          prisma.session.findUnique({
            where: { id: payload.sessionId },
            select: { id: true, expiredAt: true },
          }),
          userService.findAuthPrincipal(payload.userId),
        ]);

        if (!session || (session.expiredAt && session.expiredAt <= new Date())) {
          return done(
            new UnauthorizedException(
              'Session expired or invalid',
              ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
            ),
            false,
          );
        }

        if (!user) {
          return done(
            new UnauthorizedException('User not found', ErrorCode.AUTH_USER_NOT_FOUND),
            false,
          );
        }

        // Identity layer ONLY: validates the session and resolves the principal.
        // Store lifecycle (suspension, KYC state, email verification) is enforced
        // by Layer-2 guards (requireStoreState), so every
        // surface returns a precise 403 with a distinct ErrorCode instead of a
        // generic auth failure here.
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
