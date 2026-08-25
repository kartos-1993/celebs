import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { PATHS } from './paths';

import { FullscreenLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return <FullscreenLoader />;
  }

  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${PATHS.AUTH.LOGIN}?returnUrl=${returnUrl}`} replace />;
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
