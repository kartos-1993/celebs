import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { RoleGuard } from '@/routes/role-guard';

const VendorListPage = lazy(() => import('./pages/vendor-list-page'));

export const vendorRoutes: RouteObject = {
  path: 'vendors',
  element: (
    <RoleGuard requiredPermission={Permission.VENDOR_VIEW}>
      <VendorListPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Vendors' },
};
