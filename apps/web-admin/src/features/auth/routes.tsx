import { Navigate, RouteObject } from 'react-router-dom';

import { pageRoute } from '@/routes/page-route';

export const authRoutes: RouteObject[] = [
  {
    path: '/login',
    ...pageRoute(() => import('./pages/sign-in-page')),
  },
  {
    path: '/setup-superadmin',
    ...pageRoute(() => import('./pages/setup-superadmin-page')),
  },
  {
    path: '/setup-admin',
    element: <Navigate to="/setup-superadmin" replace />,
  },
  {
    path: '/vendor/register',
    ...pageRoute(() => import('./pages/vendor-register-page')),
  },
];
