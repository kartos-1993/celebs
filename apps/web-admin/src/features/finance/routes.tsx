import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const financeRoutes: RouteObject = {
  path: 'finance',
  ...pageRoute(
    () => import('./pages/finance-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.FINANCE_VIEW}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Finance', skeleton: 'dashboard' },
};
