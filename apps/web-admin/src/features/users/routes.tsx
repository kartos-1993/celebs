import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const UserListPage = lazy(() => import('./pages/user-list-page'));

export const userRoutes: RouteObject = {
  path: 'users',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <UserListPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Users' },
};
