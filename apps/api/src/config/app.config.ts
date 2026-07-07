import { getEnv } from '@celebs/shared-utils';
// Removed JWT_SECRET logging as it will be properly handled inside the config
export const appConfig = () => {
  const env = getEnv('NODE_ENV');
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  const appOriginEnv = getEnv('APP_ORIGIN'); // "http://localhost:3333,http://localhost:5173"
  const appOrigins = appOriginEnv
    .split(',') // [ "http://localhost:3333", "http://localhost:5173" ]
    .map((o) => o.trim().replace(/\/$/, ''));
  return {
    NODE_ENV: env,
    APP_ORIGIN: appOrigins,
    PORT: getEnv('PORT'),
    BASE_PATH: getEnv('BASE_PATH'),
    JWT: {
      SECRET: getEnv('JWT_SECRET'),
      EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
      REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
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
    MONGODB_URI: getEnv('MONGODB_URI', 'mongodb://localhost:27017/fashion-ecommerce'),
    CLOUDINARY: {
      CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
      API_KEY: getEnv('CLOUDINARY_API_KEY'),
      API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
      FOLDER: getEnv('CLOUDINARY_FOLDER', 'celebs_media'),
    },
  };
};

export const config = appConfig();
