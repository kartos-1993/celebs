import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const SignIn = lazy(() => import('./sign-in'));
const SetupSuperadmin = lazy(() => import('./setup-superadmin'));
const VendorRegister = lazy(() => import('./vendor-register'));

export const authRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <SignIn />,
  },
  {
    path: '/setup-superadmin',
    element: <SetupSuperadmin />,
  },
  {
    path: '/vendor/register',
    element: <VendorRegister />,
  },
];
