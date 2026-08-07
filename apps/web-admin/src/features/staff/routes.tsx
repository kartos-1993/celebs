import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const StaffListPage = lazy(() => import('./pages/staff-list-page'));

export const staffRoutes: RouteObject = {
  path: 'staff',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <StaffListPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Staff' },
};
