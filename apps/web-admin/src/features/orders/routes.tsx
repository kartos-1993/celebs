import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const OrdersPage = lazy(() => import('./pages/orders-page'));
const ReturnOrdersPage = lazy(() => import('./pages/return-orders-page'));
const ReviewsPage = lazy(() => import('./pages/reviews-page'));

export const orderRoutes: RouteObject = {
  path: 'orders',
  handle: { crumb: 'Orders and Reviews' },
  children: [
    {
      path: '',
      element: (
        <RoleGuard requiredPermission={Permission.ORDER_VIEW}>
          <OrdersPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Orders' },
    },
    {
      path: 'return',
      element: (
        <RoleGuard requiredPermission={Permission.ORDER_VIEW}>
          <ReturnOrdersPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Return Orders' },
    },
    {
      path: 'reviews',
      element: (
        <RoleGuard requiredPermission={Permission.ORDER_VIEW}>
          <ReviewsPage />
        </RoleGuard>
      ),
      handle: { crumb: 'Reviews' },
    },
  ],
};
