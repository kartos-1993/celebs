import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

/**
 * The platform commission rate.
 *
 * COMMISSION_MANAGE, which is deliberately SUPERADMIN-only. ADMIN already holds
 * FINANCE_PLATFORM_VIEW and FINANCE_PLATFORM_MANAGE and can read platform finance
 * and reconcile courier settlements; being able to set the rate to zero is a
 * different power, and the one edit here that cannot be undone.
 */
export const commissionRoutes: RouteObject = {
  path: 'finance/commissions',
  ...pageRoute(
    () => import('./pages/commissions-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.COMMISSION_MANAGE}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Commission Rates', skeleton: 'dashboard' },
};
