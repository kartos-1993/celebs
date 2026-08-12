import { config } from '@/config/app.config';

function getPrimaryOrigin(): string {
  const rawOrigin =
    (Array.isArray(config.APP_ORIGIN) ? config.APP_ORIGIN[0] : config.APP_ORIGIN) ||
    'http://localhost:5173';
  return rawOrigin.replace(/\/+$/, '');
}

/**
 * Safely constructs a Web App URL (e.g. for emails or external redirects)
 * eliminating double slashes and preserving query params.
 */
export function buildWebUrl(path: string, queryParams?: Record<string, string>): string {
  const origin = getPrimaryOrigin();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${origin}${cleanPath}`);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });
  }

  return url.toString();
}

/**
 * Safely constructs a Backend API URL.
 */
export function buildApiUrl(path: string, queryParams?: Record<string, string>): string {
  const origin = getPrimaryOrigin();
  const basePath = (config.BASE_PATH || '/api/v1').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${origin}${basePath}${cleanPath}`);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });
  }

  return url.toString();
}
