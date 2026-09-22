import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const userRoutes: RouteObject = {
  path: 'users',
  ...pageRoute(
    () => import('./pages/user-list-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.USER_VIEW}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Users' },
};
