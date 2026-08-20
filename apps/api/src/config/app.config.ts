import { getEnv } from '@celebs/shared-utils';

import { env as validatedEnv } from './env.validation';

export const appConfig = () => {
  const env = validatedEnv.NODE_ENV;
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  const appOrigins = validatedEnv.APP_ORIGIN;
  return {
    NODE_ENV: env,
    APP_ORIGIN: appOrigins,
    PORT: validatedEnv.PORT,
    API_PREFIX: '/api',
    API_VERSION: 'v1',
    BASE_PATH: validatedEnv.BASE_PATH || '/api/v1',
    JWT: {
      SECRET: validatedEnv.JWT_SECRET,
      EXPIRES_IN: validatedEnv.JWT_EXPIRES_IN,
      REFRESH_SECRET: validatedEnv.JWT_REFRESH_SECRET,
      REFRESH_EXPIRES_IN: validatedEnv.JWT_REFRESH_EXPIRES_IN,
    },
    SESSION: {
      EXPIRY_DAYS: validatedEnv.SESSION_EXPIRES_IN_DAYS,
      EXPIRY_MS: validatedEnv.SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    },
    MAILER_SENDER: validatedEnv.SMTP_FROM,
    MAILER_API_KEY: validatedEnv.SMTP_API_KEY,
    COOKIE: {
      HTTPONLY: true,
      SECURE: isProduction || isStaging ? true : false,
      SAME_SITE: (isStaging ? 'none' : isProduction ? 'strict' : 'lax') as
        | 'strict'
        | 'lax'
        | 'none',
      DOMAIN: validatedEnv.COOKIE_DOMAIN || (isProduction ? 'yourdomain.com' : ''),
    },
    SETUP_SECRET: validatedEnv.SETUP_SECRET,

    S3: {
      REGION: validatedEnv.S3_REGION,
      BUCKET_NAME: validatedEnv.S3_BUCKET_NAME,
      ENDPOINT: validatedEnv.S3_ENDPOINT || 'http://127.0.0.1:9000',
      ACCESS_KEY_ID: validatedEnv.AWS_ACCESS_KEY_ID || 'minioadmin',
      SECRET_ACCESS_KEY: validatedEnv.AWS_SECRET_ACCESS_KEY || 'minioadmin',
      /** Optional CDN / public base (e.g. CloudFront). When set, public URLs use this prefix. */
      PUBLIC_BASE_URL:
        validatedEnv.MEDIA_PUBLIC_BASE_URL ||
        getEnv('NEXT_PUBLIC_CLOUDFRONT_DOMAIN', 'http://127.0.0.1:9000/celebs'),
    },
    GOOGLE: {
      WEB_CLIENT_ID: validatedEnv.GOOGLE_WEB_CLIENT_ID,
      ANDROID_CLIENT_ID: validatedEnv.GOOGLE_ANDROID_CLIENT_ID,
      IOS_CLIENT_ID: validatedEnv.GOOGLE_IOS_CLIENT_ID,
      /** All non-empty client IDs — passed as audience to verifyIdToken() */
      ALLOWED_CLIENT_IDS: [
        validatedEnv.GOOGLE_WEB_CLIENT_ID,
        validatedEnv.GOOGLE_ANDROID_CLIENT_ID,
        validatedEnv.GOOGLE_IOS_CLIENT_ID,
      ].filter(Boolean),
    },
    REDIS: {
      HOST: validatedEnv.REDIS_HOST,
      PORT: validatedEnv.REDIS_PORT,
      PASSWORD: validatedEnv.REDIS_PASSWORD,
    },
  };
};

export const config = appConfig();
