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
      REFRESH_SECRET: validatedEnv.JWT_REFRESH_SECRET || validatedEnv.JWT_SECRET,
      REFRESH_EXPIRES_IN: validatedEnv.JWT_REFRESH_EXPIRES_IN,
    },
    MAILER_SENDER: validatedEnv.SMTP_FROM,
    MAILER_API_KEY: validatedEnv.SMTP_API_KEY,
    COOKIE: {
      HTTPONLY: isProduction || isStaging ? true : false,
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
    GOOGLE_CLIENT_ID: getEnv(
      'GOOGLE_CLIENT_ID',
      '998383824177-n0b1v1cr5iq1pr456ik5jhfafqj7m9p6.apps.googleusercontent.com',
    ),
    REDIS: {
      HOST: validatedEnv.REDIS_HOST,
      PORT: validatedEnv.REDIS_PORT,
      PASSWORD: validatedEnv.REDIS_PASSWORD,
    },
  };
};

export const config = appConfig();
