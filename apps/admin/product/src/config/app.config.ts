import { getEnv } from '../common/utils/get-env';

export const appConfig = () => {
  const env = getEnv('NODE_ENV');
  const isProduction = env === 'production';
  const isStaging = env === 'staging';

  const appOriginEnv = getEnv('APP_ORIGIN'); // "http://localhost:3333,http://localhost:5173"
  const appOrigins = appOriginEnv
    .split(',') // [ "http://localhost:3333", "http://localhost:5173" ]
    .map((o) => o.trim());

  return {
    NODE_ENV: env,
    APP_ORIGIN: appOrigins,
    PORT: getEnv('PORT', '5001'),
    BASE_PATH: getEnv('BASE_PATH', '/api/v1'),
    JWT: {
      SECRET: getEnv('JWT_SECRET'),
      EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m'),
    },
    MONGODB_URI: getEnv('MONGODB_URI', 'mongodb://localhost:27017/fashion-ecommerce'),
    AWS: {
      ACCESS_KEY_ID: getEnv('AWS_ACCESS_KEY_ID'),
      SECRET_ACCESS_KEY: getEnv('AWS_SECRET_ACCESS_KEY'),
      REGION: getEnv('AWS_REGION', 'us-east-1'),
      BUCKET_NAME: getEnv('AWS_BUCKET_NAME')
    },
    LOG_LEVEL: getEnv('LOG_LEVEL', 'info')
  };
};

export const config = appConfig();