import { Navigate } from 'react-router-dom';

import { type AppRouteObject, resolveDefaultLandingRoute } from './landing-resolver';
import { routesConfig } from './routes-config';

import { useAuthContext } from '@/context/auth-provider';

/**
 * Index route for `/`: sends each role to its resolved landing page.
 * Logged-out users never reach here (AuthGuard redirects to login first).
 */
export function DashboardIndex() {
  const { user } = useAuthContext();
  const target = resolveDefaultLandingRoute(routesConfig as AppRouteObject[], user ?? undefined);
  return <Navigate to={target} replace />;
}
