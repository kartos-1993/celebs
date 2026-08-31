import passport, { PassportStatic } from 'passport';
import { ExtractJwt, Strategy as JwtStrategy, StrategyOptionsWithRequest } from 'passport-jwt';

import { ErrorCode, UnauthorizedException } from '@celebs/shared-utils';

import { authCache, authCacheLoaders } from '@/common/cache/auth-cache';
import { config } from '@/config/app.config';
import { setSentryUser } from '@/config/sentry';

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
        // Redis-first (30s TTL) with Postgres fallback. Session keys are
        // invalidated at every revocation point (logout, refresh-reuse,
        // store suspension), so instant server-side revocation still holds.
        const [session, user] = await Promise.all([
          authCache
            .getSession(payload.sessionId)
            .then((hit) => hit ?? authCacheLoaders.loadSession(payload.sessionId)),
          authCache
            .getUser(payload.userId)
            .then((hit) => hit ?? authCacheLoaders.loadUser(payload.userId)),
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
        setSentryUser(mappedUser);
        return done(null, mappedUser);
      } catch (error) {
        return done(error, false);
      }
    }),
  );
};

import { NextFunction, Request, Response } from 'express';

function extractAuthErrorMessage(info: unknown): string {
  if (info instanceof Error) {
    return info.message;
  }
  if (typeof info === 'object' && info !== null && 'message' in info) {
    return String((info as { message: unknown }).message);
  }
  return 'Authentication required';
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: unknown, user: Express.User | false, info: unknown) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        const message = extractAuthErrorMessage(info);
        return next(new UnauthorizedException(message, ErrorCode.AUTH_UNAUTHORIZED_ACCESS));
      }
      req.user = user;
      next();
    },
  )(req, res, next);
};

export const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  passport.authenticate('jwt', { session: false }, (_err: unknown, user: Express.User | false) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};
