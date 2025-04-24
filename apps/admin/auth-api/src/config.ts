import * as dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const environment = process.env.NODE_ENV || 'development';
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${environment}`),
});

// RBAC roles and permissions
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  EMPLOYEE = 'employee',
}

export const Permissions = {
  [Role.ADMIN]: ['read', 'write', 'delete'],
  [Role.USER]: ['read', 'write'],
  [Role.EMPLOYEE]: ['read'],
};

// Database Configuration
export const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Redis Configuration
const REDIS_URL = process.env.REDIS_URL;
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  url:
    REDIS_URL ||
    (process.env.REDIS_HOST
      ? `redis://${
          process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''
        }${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
      : undefined),
};

// JWT Configuration
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
};

if (!JWT_CONFIG.secret) {
  throw new Error('JWT_SECRET is required');
}

// SMTP Configuration
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER,
  password: process.env.SMTP_PASSWORD,
};

// App Configuration
export const PORT = parseInt(process.env.PORT || '3000', 10);
export const NODE_ENV = environment;
export const SESSION_SECRET =
  process.env.SESSION_SECRET || process.env.JWT_SECRET;

// Unified config object for app.ts
export const config = {
  nodeEnv: NODE_ENV,
  redis: REDIS_CONFIG,
  sessionSecret: SESSION_SECRET,
};

// Export JWT_SECRET alias for legacy imports
export const JWT_SECRET = JWT_CONFIG.secret;
