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
    BASE_PATH: validatedEnv.BASE_PATH,
    JWT: {
      SECRET: validatedEnv.JWT_SECRET,
      EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
      REFRESH_SECRET: validatedEnv.JWT_REFRESH_SECRET || validatedEnv.JWT_SECRET,
      REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
    },
    MAILER_SENDER: getEnv('SMTP_FROM'),
    MAILER_API_KEY: getEnv('SMTP_API_KEY'),
    COOKIE: {
      HTTPONLY: isProduction || isStaging ? true : false,
      SECURE: isProduction || isStaging ? true : false,
      SAME_SITE: (isStaging ? 'none' : isProduction ? 'strict' : 'lax') as
        | 'strict'
        | 'lax'
        | 'none',
      DOMAIN: getEnv('COOKIE_DOMAIN', isProduction ? 'yourdomain.com' : ''),
    },
    SETUP_SECRET: getEnv('SETUP_SECRET', 'celebs-superadmin-secret-2026'),
    CLOUDINARY: {
      CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
      API_KEY: getEnv('CLOUDINARY_API_KEY'),
      API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
      FOLDER: getEnv('CLOUDINARY_FOLDER', 'celebs_media'),
    },
    S3: {
      REGION: getEnv('S3_REGION', 'ap-south-1'),
      BUCKET_NAME: getEnv('S3_BUCKET_NAME', 'celebs'),
      ENDPOINT: getEnv('S3_ENDPOINT', 'http://127.0.0.1:9000'),
      ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID', 'minioadmin'),
      SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
      /** Optional CDN / public base (e.g. CloudFront). When set, public URLs use this prefix. */
      PUBLIC_BASE_URL: getEnv(
        'MEDIA_PUBLIC_BASE_URL',
        getEnv('NEXT_PUBLIC_CLOUDFRONT_DOMAIN', 'http://127.0.0.1:9000/celebs'),
      ),
    },
    GOOGLE_CLIENT_ID: getEnv(
      'GOOGLE_CLIENT_ID',
      '998383824177-n0b1v1cr5iq1pr456ik5jhfafqj7m9p6.apps.googleusercontent.com',
    ),
    REDIS: {
      HOST: getEnv('REDIS_HOST', 'localhost'),
      PORT: parseInt(getEnv('REDIS_PORT', '6379'), 10),
      PASSWORD: getEnv('REDIS_PASSWORD', ''),
    },
  };
};

export const config = appConfig();
