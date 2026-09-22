import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const vendorRoutes: RouteObject = {
  path: 'vendors',
  ...pageRoute(
    () => import('./pages/vendor-list-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.VENDOR_VIEW}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Vendors' },
};
