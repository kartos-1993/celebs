import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const FinancePage = lazy(() => import('./pages/finance-page'));

export const financeRoutes: RouteObject = {
  path: 'finance',
  element: (
    <RoleGuard requiredPermission={Permission.FINANCE_VIEW}>
      <FinancePage />
    </RoleGuard>
  ),
  handle: { crumb: 'Finance' },
};
