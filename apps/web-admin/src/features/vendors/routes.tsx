import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const VendorList = lazy(() => import('./vendor-list'));

export const vendorRoutes: RouteObject = {
  path: 'vendors',
  element: (
    <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
      <VendorList />
    </RoleGuard>
  ),
  handle: { crumb: 'Vendors' },
};
