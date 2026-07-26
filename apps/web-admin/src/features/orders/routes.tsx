import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const Orders = lazy(() => import('./orders'));
const ReturnOrders = lazy(() => import('./return-orders'));
const Reviews = lazy(() => import('./reviews'));

export const orderRoutes: RouteObject = {
  path: 'orders',
  handle: { crumb: 'Orders and Reviews' },
  children: [
    {
      path: '',
      element: <Orders />,
      handle: { crumb: 'Orders' },
    },
    {
      path: 'return',
      element: <ReturnOrders />,
      handle: { crumb: 'Return Orders' },
    },
    {
      path: 'reviews',
      element: <Reviews />,
      handle: { crumb: 'Reviews' },
    },
  ],
};
