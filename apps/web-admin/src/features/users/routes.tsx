import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const UserList = lazy(() => import('./user-list'));

export const userRoutes: RouteObject = {
  path: 'users',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <UserList />
    </RoleGuard>
  ),
  handle: { crumb: 'Users' },
};
