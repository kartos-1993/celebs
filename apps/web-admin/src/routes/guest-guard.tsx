import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { PATHS } from './paths';

import { useAuthContext } from '@/context/auth-provider';
import { useSetupStatus } from '@/features/auth/hooks/use-auth-queries';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthContext();
  const { data: setupData } = useSetupStatus();
  const location = useLocation();

  // Fail-open on the setup check: public routes render while it resolves
  // and only redirect on a positive setupRequired — a failed/slow check
  // must never blank the login form.
  if (isLoading) {
    return null;
  }

  const setupRequired = setupData?.data?.setupRequired;
  const isSetupPath =
    location.pathname === PATHS.AUTH.SETUP_SUPERADMIN ||
    location.pathname === PATHS.AUTH.SETUP_ADMIN;

  // When platform setup is required, lock down guest routing directly to setup wizard
  if (setupRequired && !isSetupPath) {
    return <Navigate to={PATHS.AUTH.SETUP_SUPERADMIN} replace />;
  }

  if (user && user.role !== 'CUSTOMER') {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
