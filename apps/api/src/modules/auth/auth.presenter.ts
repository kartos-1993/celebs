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
  const surface = (req.headers['x-surface'] || req.body?.surface) as string | undefined;
  return surface === 'mobile';
};

export const toAuthResponseDto = <T>(
  req: Request,
  user: T,
  tokens: AuthTokens,
): AuthResponseDto<T> => {
  if (isMobileSurface(req)) {
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }
  return { user };
};
