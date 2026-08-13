import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const StaffListPage = lazy(() => import('./pages/staff-list-page'));

export const staffRoutes: RouteObject = {
  path: 'staff',
  element: (
    <RoleGuard requiredPermission={Permission.STAFF_VIEW}>
      <StaffListPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Staff' },
};
