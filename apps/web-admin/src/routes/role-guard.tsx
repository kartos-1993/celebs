import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import {
  hasPermissionAccess,
  type Permission,
  type PermissionMode,
  type PermissionRequirement,
} from '@celebs/rbac';

import { PATHS } from './paths';

import PageLoader from '@/components/page-loader';
import { useAuthContext } from '@/context/auth-provider';

interface RoleGuardProps {
  children: React.ReactNode;
  permissions?: PermissionRequirement;
  permissionMode?: PermissionMode;
  requiredPermission?: Permission;
  allowedRoles?: string[];
  fallbackPath?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  permissions,
  permissionMode = 'ANY',
  requiredPermission,
  allowedRoles,
  fallbackPath = PATHS.ERRORS.FORBIDDEN,
}) => {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={PATHS.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  const role = user.role;
  const userPermissions = user.permissions;

  // 1. Evaluate polymorphic permission requirement
  const effectiveRequirement = permissions ?? requiredPermission;
  if (effectiveRequirement) {
    const isAllowed = hasPermissionAccess(
      role,
      userPermissions,
      effectiveRequirement,
      permissionMode,
    );
    if (!isAllowed) {
      return (
        <Navigate
          to={fallbackPath}
          replace
          state={{
            from: location.pathname,
            requiredPermissions: effectiveRequirement,
            userRole: role,
          }}
        />
      );
    }
  }

  // 2. Evaluate allowedRoles fallback
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location.pathname,
          allowedRoles,
          userRole: role,
        }}
      />
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
