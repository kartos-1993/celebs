import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const financeRoutes: RouteObject = {
  path: 'finance',
  ...pageRoute(
    () => import('./pages/finance-page'),
    (Page) => (
      // Not FINANCE_VIEW: that one is a seller's read on their own shop. This page
      // is the marketplace's dealings with its couriers, so it asks for the
      // platform permission instead.
      <RoleGuard requiredPermission={Permission.FINANCE_PLATFORM_VIEW}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Finance', skeleton: 'dashboard' },
};
