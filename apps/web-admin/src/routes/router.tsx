// router.tsx
import { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  redirect,
  json,
} from 'react-router-dom';
import {
  ProtectedLoaderData,
  ProtectedLoader,
} from '../types';
import { getUserSessionQueryFn, getSetupStatusQueryFn } from '@/lib/api';
import AppLayout from '@/layout/AppLayout';
import PageLoader from '@/components/page-loader';

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

const appLoader: ProtectedLoader = async ({ request }) => {
  try {
    const sessionResponse = await getUserSessionQueryFn();
    
    if (!sessionResponse.data) {
      throw new Error('Session data not found');
    }
    const user = sessionResponse.data.user;
    const url = new URL(request.url);
    if (
      user.role === 'VENDOR' &&
      user.vendorProfile &&
      user.vendorProfile.onboardingStep < 5 &&
      !url.pathname.startsWith('/onboarding')
    ) {
      return redirect('/onboarding');
    }

    return json<ProtectedLoaderData>({ user });
  } catch (error) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname && pathname !== '/' && pathname !== '/login') {
      const returnUrl = encodeURIComponent(pathname + url.search);
      return redirect(`/login?returnUrl=${returnUrl}`);
    }
    return redirect('/login');
  }
};

// Loader for login route to redirect if already logged in
const loginLoader: ProtectedLoader = async ({ request }) => {
  try {
    const sessionResponse = await getUserSessionQueryFn();
    if (sessionResponse.data && sessionResponse.data.user) {
      const url = new URL(request.url);
      const returnUrl = url.searchParams.get('returnUrl');
      const target = returnUrl ? decodeURIComponent(returnUrl) : '/';
      return redirect(target);
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Loader to prevent accessing setup page if SUPERADMIN already exists
const setupSuperadminLoader: ProtectedLoader = async () => {
  try {
    const statusResponse = await getSetupStatusQueryFn();
    if (statusResponse.success && !statusResponse.data.setupRequired) {
      return redirect('/login');
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Helper to attach loader to auth routes
const formattedAuthRoutes = authRoutes.map((route) => {
  if (route.path === '/login') {
    return { ...route, loader: loginLoader };
  }
  if (route.path === '/setup-superadmin') {
    return { ...route, loader: setupSuperadminLoader };
  }
  return route;
});

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    handle: { crumb: 'Home' },
    loader: appLoader,
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
  ...formattedAuthRoutes.map((route) => ({
    ...route,
    element: <Suspense fallback={<PageLoader />}>{route.element}</Suspense>,
  })),
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundError />
      </Suspense>
    ),
  },
]);
