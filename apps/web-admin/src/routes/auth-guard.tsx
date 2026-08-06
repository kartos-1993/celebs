import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/auth-provider';
import PageLoader from '@/components/page-loader';
import { PATHS } from './paths';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${PATHS.AUTH.LOGIN}?returnUrl=${returnUrl}`} replace />;
  }

  // Redirect vendor to onboarding if step < 5 and not currently on /onboarding
  if (
    user.role === 'VENDOR' &&
    user.vendorProfile &&
    user.vendorProfile.onboardingStep < 5 &&
    !location.pathname.startsWith(PATHS.VENDORS.ONBOARDING)
  ) {
    return <Navigate to={PATHS.VENDORS.ONBOARDING} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
