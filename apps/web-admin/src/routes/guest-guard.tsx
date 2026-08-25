import React from 'react';
import { Navigate } from 'react-router-dom';

import { PATHS } from './paths';

import { FullscreenLoader } from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return <FullscreenLoader />;
  }

  if (user) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
