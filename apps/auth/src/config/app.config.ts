import { get } from 'http';
import { getEnv } from '../common/utils/get-env';
// Removed JWT_SECRET logging as it will be properly handled inside the config
export const appConfig = () => {
  const env = getEnv('NODE_ENV');
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  const appOriginEnv = getEnv('APP_ORIGIN'); // "http://localhost:3333,http://localhost:5173"
  const appOrigins = appOriginEnv
    .split(',') // [ "http://localhost:3333", "http://localhost:5173" ]
    .map((o) => o.trim());
console.log('JWT SECRET:AUTH SERVICE', getEnv('JWT_SECRET'));
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
      SAME_SITE: (isProduction || isStaging ? 'strict' : 'lax') as
        | 'strict'
        | 'lax'
        | 'none',
      DOMAIN: getEnv('COOKIE_DOMAIN', isProduction ? 'yourdomain.com' : ''),
    },
  };
};

export const config = appConfig();
