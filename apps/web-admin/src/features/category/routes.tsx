import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const categoryRoutes: RouteObject = {
  path: 'categories',
  ...pageRoute(
    () => import('./pages/categories-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.CATALOG_MANAGE}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Categories', skeleton: 'table' },
};
