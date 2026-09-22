import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const orderRoutes: RouteObject = {
  path: 'orders',
  handle: { crumb: 'Orders and Reviews' },
  children: [
    {
      path: '',
      ...pageRoute(
        () => import('./pages/orders-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.ORDER_VIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Orders' },
    },
    {
      path: 'return',
      ...pageRoute(
        () => import('./pages/return-orders-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.ORDER_VIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Return Orders' },
    },
    {
      path: 'reviews',
      ...pageRoute(
        () => import('./pages/reviews-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.ORDER_VIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
      handle: { crumb: 'Reviews' },
    },
  ],
};
