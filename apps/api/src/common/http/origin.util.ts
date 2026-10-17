import { config } from '@/config/app.config';

/**
 * Unified origin verification helper for CORS and CSRF guards.
 *
 * Enforces strict origin allowlists in production while permitting
 * localhost and RFC 1918 private LAN ranges in development and test environments.
 */
export function isAllowedOrigin(
  origin?: string | null,
  configuredOrigins?: string | string[],
  environment?: string,
): boolean {
  if (!origin || typeof origin !== 'string') {
    return false;
  }

  const trimmedOrigin = origin.trim();
  if (!trimmedOrigin) {
    return false;
  }

  // Ensure origin is a valid URL structure (scheme + host)
  try {
    const parsed = new URL(trimmedOrigin);
    // Origin cannot have a path, query, or hash beyond root
    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      return false;
    }
  } catch {
    return false;
  }

  const originsList: string[] = configuredOrigins
    ? Array.isArray(configuredOrigins)
      ? configuredOrigins
      : [configuredOrigins]
    : Array.isArray(config.APP_ORIGIN)
      ? config.APP_ORIGIN
      : [config.APP_ORIGIN];

  if (originsList.includes(trimmedOrigin)) {
    return true;
  }

  const currentEnv = environment || config.NODE_ENV || process.env.NODE_ENV || 'development';
  if (currentEnv === 'development' || currentEnv === 'test') {
    return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
      trimmedOrigin,
    );
  }

  return false;
}
