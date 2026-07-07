// router.tsx
import {
  createBrowserRouter,
  RouterProvider,
  redirect,
  json,
} from 'react-router-dom';
import SignIn from '@/features/auth/sign-in';
import SetupSuperadmin from '@/features/auth/setup-superadmin';
import VendorRegister from '@/features/auth/vendor-register';
import App from '@/App';

import Products from '@/features/product/components/manage-product';
import {
  ProtectedLoaderData,
  ProtectedLoader,
  SessionResponse,
} from '../types';
import { getUserSessionQueryFn, getSetupStatusQueryFn } from '@/lib/api';
import AppLayout from '@/layout/AppLayout';
import Categories from '@/features/category';
import ManageProduct from '@/features/product/components/manage-product';
import AddProduct from '@/features/product/components/add-product';
import MediaCenter from '@/features/product/media-center';
import Orders from '@/features/orders/orders';
import ReturnOrders from '@/features/orders/return-orders';
import Reviews from '@/features/orders/reviews';
import Settings from '@/features/account/settings';
import AccountSettings from '@/features/account/account-settings';
import Finance from '@/features/finance/finance';
import NotFoundError from '@/features/errors/NotFoundError';
import OnboardingWizard from '@/features/vendor-onboarding/onboarding-wizard';
import VendorList from '@/features/vendors/vendor-list';
import UserList from '@/features/users/user-list';
import StaffList from '@/features/staff/staff-list';

import { RoleGuard } from '@/components/role-guard';

const appLoader: ProtectedLoader = async ({ request }) => {
  try {
    const sessionResponse = await getUserSessionQueryFn();
    console.log('apploader firstName');
    
    // Global onboarding redirect check in loader
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
    return redirect('/login');
  }
};

// Loader for login route to redirect if already logged in
const loginLoader: ProtectedLoader = async () => {
  try {
    const sessionResponse = await getUserSessionQueryFn();
    console.log('loginloader firstName');
    // If session exists with user data, redirect to root (/)
    if (sessionResponse.data && sessionResponse.data.user) {
      return redirect('/');
    }
    return null; // No data needed if rendering SignIn
  } catch (error) {
    // If session fetch fails (e.g., 401), proceed to render SignIn
    console.log('error', error);
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    handle: { crumb: 'Home' },
    loader: appLoader,
    children: [
      {
        path: 'products',
        handle: { crumb: 'Products' },
        children: [
          {
            path: 'manage',
            element: <ManageProduct />,
            handle: { crumb: 'Manage Product' },
          },
          {
            path: 'new',
            element: <AddProduct />,
            handle: { crumb: 'Add Product' },
          },
          {
            path: 'mediacenter',
            element: <MediaCenter />,
            handle: { crumb: 'Media Center' },
          },
        ],
      },
      {
        path: 'categories',
        element: <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}><Categories /></RoleGuard>,
        handle: { crumb: 'Categories' },
      },
      {
        path: 'vendors',
        element: <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}><VendorList /></RoleGuard>,
        handle: { crumb: 'Vendors' },
      },
      {
        path: 'users',
        element: <RoleGuard allowedRoles={['SUPERADMIN']}><UserList /></RoleGuard>,
        handle: { crumb: 'Users' },
      },
      {
        path: 'staff',
        element: <RoleGuard allowedRoles={['VENDOR', 'SUPERADMIN']}><StaffList /></RoleGuard>,
        handle: { crumb: 'Staff' },
      },
      {
        path: 'onboarding',
        element: <RoleGuard allowedRoles={['VENDOR']}><OnboardingWizard /></RoleGuard>,
        handle: { crumb: 'Onboarding' },
      },
      {
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
      },
      {
        path: 'account',
        handle: { crumb: 'My Account' },
        children: [
          {
            path: 'settings',
            element: <Settings />,
            handle: { crumb: 'Settings' },
          },
          {
            path: 'account-setting',
            element: <AccountSettings />,
            handle: { crumb: 'Account Settings' },
          },
        ],
      },
      {
        path: 'finance',
        element: <RoleGuard allowedRoles={['VENDOR', 'ADMIN', 'SUPERADMIN']}><Finance /></RoleGuard>,
        handle: { crumb: 'Finance' },
      },
    ],
  },
  {
    path: '/login',
    loader: loginLoader,
    element: <SignIn />,
  },
  {
    path: '/setup-superadmin',
    loader: setupSuperadminLoader,
    element: <SetupSuperadmin />,
  },
  {
    path: '/vendor/register',
    element: <VendorRegister />,
  },
  { path: '*', element: <NotFoundError /> },
]);
