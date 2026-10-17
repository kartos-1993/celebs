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
  // If the request arrived with an ambient refresh cookie, token delivery is strictly
  // cookie-bound. Never leak tokens into JSON response body.
  if (req.cookies?.refreshToken) {
    return { user };
  }

  // Header-based transport (mobile app using x-refresh-token header or x-surface: mobile)
  const hasHeaderRefreshToken = Boolean(req.headers['x-refresh-token']);
  if (hasHeaderRefreshToken || isMobileSurface(req)) {
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  return { user };
};
