import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const Categories = lazy(() => import('./pages/categories-page'));

export const categoryRoutes: RouteObject = {
  path: 'categories',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <Categories />
    </RoleGuard>
  ),
  handle: { crumb: 'Categories' },
};
