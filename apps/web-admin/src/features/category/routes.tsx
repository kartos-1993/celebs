import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const Categories = lazy(() => import('./index'));

export const categoryRoutes: RouteObject = {
  path: 'categories',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <Categories />
    </RoleGuard>
  ),
  handle: { crumb: 'Categories' },
};
