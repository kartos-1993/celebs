import { ErrorCode, UnauthorizedException } from '@celebs/shared-utils';

import {
  AccessTPayload,
  refreshTokenSignOptions,
  RefreshTPayload,
  signJwtToken,
  verifyJwtToken,
} from '@/common/utils/jwt';
import { config } from '@/config/app.config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenService {
  public issueTokenPair(userId: string, sessionId: string, jti?: string): TokenPair {
    const accessTokenPayload: AccessTPayload = {
      userId,
      sessionId,
    };

    const refreshTokenPayload: RefreshTPayload = {
      sessionId,
      jti,
    };

    const accessToken = signJwtToken(accessTokenPayload);
    const refreshToken = signJwtToken(refreshTokenPayload, refreshTokenSignOptions);

    return {
      accessToken,
      refreshToken,
    };
  }

  public verifyRefreshToken(token?: string): RefreshTPayload {
    if (!token) {
      throw new UnauthorizedException('Refresh token missing', ErrorCode.AUTH_TOKEN_NOT_FOUND);
    }

    const { payload, error } = verifyJwtToken<RefreshTPayload>(token, {
      secret: config.JWT.REFRESH_SECRET,
    });

    if (error || !payload?.sessionId) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
        ErrorCode.AUTH_UNAUTHORIZED_ACCESS,
      );
    }

    return payload;
  }

  public stripPassword<T extends { password?: unknown }>(user: T): Omit<T, 'password'> {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const tokenService = new TokenService();
