import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import AuthGuard from './auth-guard';
import GuestGuard from './guest-guard';
import { PATHS } from './paths';

import { accountRoutes } from '@/features/account/routes';
// Feature Routes
import { authRoutes } from '@/features/auth/routes';
import { categoryRoutes } from '@/features/category/routes';
import { financeRoutes } from '@/features/finance/routes';
import { marketingRoutes } from '@/features/marketing/routes';
import { optionSetRoutes } from '@/features/option-sets/routes';
import { orderRoutes } from '@/features/orders/routes';
import { platformSettingsRoutes } from '@/features/platform-settings/routes';
import { productRoutes } from '@/features/product/routes';
import { staffRoutes } from '@/features/staff/routes';
import { userRoutes } from '@/features/users/routes';
import { vendorOnboardingRoutes } from '@/features/vendor-onboarding/routes';
import { vendorRoutes } from '@/features/vendors/routes';
import AdminLayout from '@/layouts/admin-layout';
import AuthLayout from '@/layouts/auth-layout';
import VendorPortalLayout from '@/layouts/vendor-portal-layout';

const NotFoundError = lazy(() => import('@/features/errors/not-found-error'));
const ForbiddenError = lazy(() => import('@/features/errors/forbidden-error'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/verify-email-page'));

export const routesConfig: RouteObject[] = [
  // ── Standalone Public Routes (No AuthGuard / GuestGuard) ─────────────────
  {
    path: '/verify-email',
    element: <VerifyEmailPage />,
  },
  // ── Full Admin App (approved vendors + admins only) ───────────────────────
  {
    path: PATHS.DASHBOARD,
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    handle: { crumb: 'Home' },
    children: [
      productRoutes,
      categoryRoutes,
      optionSetRoutes,
      vendorRoutes,
      userRoutes,
      staffRoutes,
      orderRoutes,
      accountRoutes,
      financeRoutes,
      platformSettingsRoutes,
      ...marketingRoutes,
      {
        path: '403',
        element: <ForbiddenError />,
        handle: { crumb: 'Access Denied' },
      },
    ],
  },
  // ── Vendor Portal (onboarding / under-review / rejected) ──────────────────
  {
    path: PATHS.VENDORS.ONBOARDING,
    element: (
      <AuthGuard>
        <VendorPortalLayout />
      </AuthGuard>
    ),
    children: [vendorOnboardingRoutes],
  },
  // ── Auth (guest only) ─────────────────────────────────────────────────────
  {
    element: (
      <GuestGuard>
        <AuthLayout />
      </GuestGuard>
    ),
    children: authRoutes,
  },
  // ── Standalone Error Routes ───────────────────────────────────────────────
  {
    path: PATHS.ERRORS.FORBIDDEN,
    element: <ForbiddenError />,
  },
  {
    path: '*',
    element: <NotFoundError />,
  },
];

