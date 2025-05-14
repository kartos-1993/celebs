import { getEnv } from '../common/utils/get-env';

export const appConfig = () => {
  const env = getEnv('NODE_ENV');
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  const appOriginEnv = getEnv('APP_ORIGIN');
  const appOrigins = appOriginEnv.includes(',')
    ? appOriginEnv.split(',').map((origin) => origin.trim())
    : appOriginEnv;

  return {
    NODE_ENV: env,
    APP_ORIGIN: appOrigins,
    PORT: getEnv('PORT', '5000'),
    BASE_PATH: getEnv('BASE_PATH', '/api/v1'),
    JWT: {
      SECRET: getEnv('JWT_SECRET'),
      EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
      REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
      REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
    },
    MAILER_SENDER: getEnv('SMTP_FROM'),
    COOKIE: {
      HTTPONLY: isProduction || isStaging ? true : false,
      SECURE: isProduction || isStaging,
      SAME_SITE: (isProduction || isStaging ? 'strict' : 'lax') as
        | 'strict'
        | 'lax'
        | 'none',
      DOMAIN: getEnv('COOKIE_DOMAIN', isProduction ? 'yourdomain.com' : ''),
    },
  };
};

export const config = appConfig();
