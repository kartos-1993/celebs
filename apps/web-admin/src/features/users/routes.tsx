import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { RoleGuard } from '@/routes/role-guard';

const UserListPage = lazy(() => import('./pages/user-list-page'));

export const userRoutes: RouteObject = {
  path: 'users',
  element: (
    <RoleGuard requiredPermission={Permission.USER_VIEW}>
      <UserListPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Users' },
};
