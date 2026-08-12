import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const SignInPage = lazy(() => import('./pages/sign-in-page'));
const SetupSuperadminPage = lazy(() => import('./pages/setup-superadmin-page'));
const VendorRegisterPage = lazy(() => import('./pages/vendor-register-page'));
const VerifyEmailPage = lazy(() => import('./pages/verify-email-page'));

export const authRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <SignInPage />,
  },
  {
    path: '/setup-superadmin',
    element: <SetupSuperadminPage />,
  },
  {
    path: '/vendor/register',
    element: <VendorRegisterPage />,
  },
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
];
