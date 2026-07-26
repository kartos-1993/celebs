import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const StaffList = lazy(() => import('./staff-list'));

export const staffRoutes: RouteObject = {
  path: 'staff',
  element: (
    <RoleGuard allowedRoles={['VENDOR', 'SUPERADMIN']}>
      <StaffList />
    </RoleGuard>
  ),
  handle: { crumb: 'Staff' },
};
