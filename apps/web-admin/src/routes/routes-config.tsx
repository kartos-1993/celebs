import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import AdminLayout from '@/layouts/admin-layout';
import AuthLayout from '@/layouts/auth-layout';
import AuthGuard from './auth-guard';
import { PATHS } from './paths';

// Feature Routes
import { authRoutes } from '@/features/auth/routes';
import { productRoutes } from '@/features/product/routes';
import { categoryRoutes } from '@/features/category/routes';
import { vendorRoutes } from '@/features/vendors/routes';
import { vendorOnboardingRoutes } from '@/features/vendor-onboarding/routes';
import { userRoutes } from '@/features/users/routes';
import { staffRoutes } from '@/features/staff/routes';
import { orderRoutes } from '@/features/orders/routes';
import { accountRoutes } from '@/features/account/routes';
import { financeRoutes } from '@/features/finance/routes';
import { platformSettingsRoutes } from '@/features/platform-settings/routes';
import { comboRoutes } from '@/features/marketing/combo.routes';
import { campaignRoutes } from '@/features/marketing/campaign.routes';

const NotFoundError = lazy(() => import('@/features/errors/NotFoundError'));

export const routesConfig: RouteObject[] = [
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
      vendorRoutes,
      userRoutes,
      staffRoutes,
      vendorOnboardingRoutes,
      orderRoutes,
      accountRoutes,
      financeRoutes,
      platformSettingsRoutes,
      comboRoutes,
      campaignRoutes,
    ],
  },
  {
    element: <AuthLayout />,
    children: authRoutes,
  },
  {
    path: '*',
    element: <NotFoundError />,
  },
];
