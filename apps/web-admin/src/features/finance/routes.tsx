import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const Finance = lazy(() => import('./finance'));

export const financeRoutes: RouteObject = {
  path: 'finance',
  element: (
    <RoleGuard allowedRoles={['VENDOR', 'ADMIN', 'SUPERADMIN']}>
      <Finance />
    </RoleGuard>
  ),
  handle: { crumb: 'Finance' },
};
