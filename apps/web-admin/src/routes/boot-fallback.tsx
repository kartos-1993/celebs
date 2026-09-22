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
 * renders, so a static skeleton here would show the app shell on public
 * pages too. Public paths stay blank until the form paints; app routes
 * keep the geometry-matched skeleton covering chunk + session in parallel.
 */
export function BootFallback() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }
  return <FullscreenLoader />;
}
