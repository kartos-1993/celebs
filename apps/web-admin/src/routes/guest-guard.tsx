import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/context/auth-provider';
import PageLoader from '@/components/page-loader';
import { PATHS } from './paths';

interface GuestGuardProps {
  children: React.ReactNode;
}

export const GuestGuard: React.FC<GuestGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to={PATHS.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export default GuestGuard;
