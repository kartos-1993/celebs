import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const Categories = lazy(() => import('./pages/categories-page'));

export const categoryRoutes: RouteObject = {
  path: 'categories',
  element: (
    <RoleGuard requiredPermission={Permission.CATALOG_MANAGE}>
      <Categories />
    </RoleGuard>
  ),
  handle: { crumb: 'Categories' },
};
