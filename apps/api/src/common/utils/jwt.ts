import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';

import { config } from '@/config/app.config';

type StringValue = `${number}${'s' | 'm' | 'h' | 'd'}`;

export type AccessTPayload = {
  userId: string;
  sessionId: string;
};
export type RefreshTPayload = {
  sessionId: string;
};

type SignOptsAndSecret = SignOptions & {
  secret: string;
};

const defaults: SignOptions = {
  audience: ['user'],
};

const isDev = config.NODE_ENV === 'development';

export const accessTokenSignOptions: SignOptsAndSecret = {
  expiresIn: (isDev ? '1h' : config.JWT.EXPIRES_IN || '15m') as StringValue | number,
  secret: config.JWT.SECRET,
};

export const refreshTokenSignOptions: SignOptsAndSecret = {
  expiresIn: (isDev ? '7d' : config.JWT.REFRESH_EXPIRES_IN || '30d') as StringValue | number,
  secret: config.JWT.REFRESH_SECRET,
};

export const signJwtToken = (
  payload: AccessTPayload | RefreshTPayload,
  options?: SignOptsAndSecret,
) => {
  const { secret, ...opts } = options || accessTokenSignOptions;
  return jwt.sign(payload, secret, {
    ...defaults,
    ...opts,
  });
};

export const verifyJwtToken = <TPayload extends object = AccessTPayload>(
  token: string,
  options?: VerifyOptions & { secret: string },
) => {
  try {
    const { secret = config.JWT.SECRET, ...opts } = options || {};
    const payload = jwt.verify(token, secret, {
      ...defaults,
      ...opts,
    }) as TPayload;
    return { payload };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: message,
    };
  }
};
