import { ErrorCode, UnauthorizedException } from '@celebs/shared-utils';

import passport, { PassportStatic } from 'passport';
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptionsWithRequest,
} from 'passport-jwt';
import { config } from '../../config/app.config';
import { userService } from '../../modules/user/user.module';
import prisma from '../../db';

interface JwtPayload {
  userId: string;
  sessionId: string;
}

const options: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      const accessToken = req.cookies.accessToken;
      if (!accessToken) {
        throw new UnauthorizedException(
          'Access token not found',
          ErrorCode.AUTH_TOKEN_NOT_FOUND
        );
      }
      return accessToken;
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
        // Validate session exists in database
        const session = await prisma.session.findUnique({
          where: { id: payload.sessionId },
        });
        if (!session) {
          return done(
            new UnauthorizedException(
              'Session expired or invalid',
              ErrorCode.AUTH_UNAUTHORIZED_ACCESS
            ),
            false
          );
        }

        const user = await userService.findUserById(payload.userId);
        if (!user) {
          return done(
            new UnauthorizedException(
              'User not found',
              ErrorCode.AUTH_USER_NOT_FOUND
            ),
            false
          );
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
    })
  );
};

export const authenticateJWT = passport.authenticate('jwt', { session: false });
