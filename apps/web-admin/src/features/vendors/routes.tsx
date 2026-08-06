import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const VendorListPage = lazy(() => import('./pages/vendor-list-page'));

export const vendorRoutes: RouteObject = {
  path: 'vendors',
  element: (
    <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
      <VendorListPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Vendors' },
};
