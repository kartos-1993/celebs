import { skeletonForPath } from './skeleton-for-path';

import { FullscreenLoader } from '@/components/page-loader';

/** Public paths render nothing while booting — no app skeleton on login. */
const PUBLIC_PREFIXES = [
  '/login',
  '/verify-email',
  '/setup-superadmin',
  '/setup-admin',
  '/vendor/register',
  '/forgot-password',
  '/reset-password',
];

/**
 * Router init fallback: the route.lazy chunk downloads before anything
 * renders. Public paths stay blank until the form paints; app routes show
 * the same silhouette AuthGuard will show once the router commits.
 */
export function BootFallback() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  // Exact '/' only (startsWith('/') would match everything): root renders
  // nothing itself and only ever redirects, so it stays blank for everyone.
  if (path === '/' || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }
  return <FullscreenLoader variant={skeletonForPath(path)} />;
}
