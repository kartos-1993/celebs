import { Request } from 'express';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseDto<T> {
  user: T;
  accessToken?: string;
  refreshToken?: string;
}

export const isMobileSurface = (req: Request): boolean => {
  const surface = req.headers['x-surface'] as string | undefined;
  return surface === 'mobile';
};

export const toAuthResponseDto = <T>(
  req: Request,
  user: T,
  tokens: AuthTokens,
): AuthResponseDto<T> => {
  // 1. Mobile surface / header transport takes precedence:
  // Native clients store tokens in SecureStore and strictly require tokens in JSON
  const hasHeaderRefreshToken = Boolean(req.headers['x-refresh-token']);
  if (isMobileSurface(req) || hasHeaderRefreshToken) {
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // 2. Web browser transport:
  // If request relies on cookies, omit tokens from JSON to prevent client-side script leakage
  if (req.cookies?.refreshToken) {
    return { user };
  }

  return { user };
};
