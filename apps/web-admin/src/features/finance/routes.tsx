import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const FinancePage = lazy(() => import('./pages/finance-page'));

export const financeRoutes: RouteObject = {
  path: 'finance',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <FinancePage />
    </RoleGuard>
  ),
  handle: { crumb: 'Finance' },
};
