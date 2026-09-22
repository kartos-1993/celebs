import React from 'react';
import { Navigate, useLocation, useMatches } from 'react-router-dom';

import type { RouteMeta, SkeletonKind } from './landing-resolver';
import { PATHS } from './paths';

import { FullscreenLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();
  const matches = useMatches();

  if (isLoading) {
    // Each route declares its own loading silhouette in its handle —
    // the boot skeleton matches the destination, never a hardcoded shape.
    const skeleton: SkeletonKind =
      [...matches]
        .reverse()
        .map((match) => (match.handle as RouteMeta | undefined)?.skeleton)
        .find((kind): kind is SkeletonKind => kind !== undefined) ?? 'page';
    return <FullscreenLoader variant={skeleton} />;
  }

  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${PATHS.AUTH.LOGIN}?returnUrl=${returnUrl}`} replace />;
  }

  // Customer block: Customers are forbidden from the web-admin / seller portal.
  if (user.role === 'CUSTOMER') {
    return (
      <Navigate
        to={PATHS.ERRORS.FORBIDDEN}
        replace
        state={{
          from: location.pathname,
          userRole: 'CUSTOMER',
          allowedRoles: ['SUPERADMIN', 'ADMIN', 'VENDOR', 'STAFF'],
        }}
      />
    );
  }

  // Vendor access gate: only APPROVED vendors reach the full AdminLayout.
  // All other statuses (PENDING, UNDER_REVIEW, REJECTED) are redirected to
  // /onboarding where the wizard decides what to render based on status.
  if (
    user.role === 'VENDOR' &&
    user.vendorProfile &&
    user.vendorProfile.status !== 'APPROVED' &&
    !location.pathname.startsWith(PATHS.VENDORS.ONBOARDING)
  ) {
    return <Navigate to={PATHS.VENDORS.ONBOARDING} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
