import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const OrdersPage = lazy(() => import('./pages/orders-page'));
const ReturnOrdersPage = lazy(() => import('./pages/return-orders-page'));
const ReviewsPage = lazy(() => import('./pages/reviews-page'));

export const orderRoutes: RouteObject = {
  path: 'orders',
  handle: { crumb: 'Orders and Reviews' },
  children: [
    {
      path: '',
      element: <OrdersPage />,
      handle: { crumb: 'Orders' },
    },
    {
      path: 'return',
      element: <ReturnOrdersPage />,
      handle: { crumb: 'Return Orders' },
    },
    {
      path: 'reviews',
      element: <ReviewsPage />,
      handle: { crumb: 'Reviews' },
    },
  ],
};
