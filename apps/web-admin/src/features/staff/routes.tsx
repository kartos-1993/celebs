import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const staffRoutes: RouteObject = {
  path: 'staff',
  ...pageRoute(
    () => import('./pages/staff-list-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.STAFF_VIEW}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Staff', skeleton: 'table' },
};
