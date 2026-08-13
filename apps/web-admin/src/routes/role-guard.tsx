import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/context/auth-provider';
import { can, Permission } from '@celebs/rbac';
import PageLoader from '@/components/page-loader';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: Permission;
  fallbackPath?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  fallbackPath = '/403',
}) => {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role;
  const userPermissions = (user as { permissions?: string[] }).permissions;

  // 1. If a specific requiredPermission is declared for the route, evaluate dynamic permissions array
  if (requiredPermission) {
    const hasPermission = can(role, requiredPermission, userPermissions);

    if (!hasPermission) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <>{children}</>;
  }

  // 2. Fallback to role-based array checking if no requiredPermission is specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
