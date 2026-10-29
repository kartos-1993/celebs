import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

/**
 * A seller's own earnings.
 *
 * Guarded by the shop-scoped FINANCE_VIEW, which a seller already holds and which
 * the registry describes as "review shop revenue, payout ledgers, earnings
 * breakdown" - this is that screen, which is why the permission finally has an
 * endpoint behind it.
 *
 * Deliberately not the platform permission: these figures belong to one seller,
 * and reusing a platform-wide permission here would either lock sellers out or
 * blur what "platform" means. Who may read whose earnings is decided inside the
 * controller, because only there is it known whether the caller is a seller or
 * admin support.
 */
export const earningsRoutes: RouteObject = {
  path: 'finance/earnings',
  ...pageRoute(
    () => import('./pages/earnings-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.FINANCE_VIEW}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Account Statements', skeleton: 'dashboard' },
};
