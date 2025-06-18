// router.tsx
import {
  createBrowserRouter,
  RouterProvider,
  redirect,
  json,
} from 'react-router-dom';
import SignIn from '@/features/auth/sign-in';
import App from '@/App';

import AddProductt from '@/features/product/add-product';
import {
  ProtectedLoaderData,
  ProtectedLoader,
  SessionResponse,
} from '../types';
import { getUserSessionQueryFn } from '@/lib/api';
import AppLayout from '@/layout/AppLayout';
import Categories from '@/features/category';
import ManageProduct from '@/features/product/manage-product';
import MediaCenter from '@/features/product/media-center';
import Orders from '@/features/orders/orders';
import ReturnOrders from '@/features/orders/return-orders';
import Reviews from '@/features/orders/reviews';
import Settings from '@/features/account/settings';
import AccountSettings from '@/features/account/account-settings';
import Finance from '@/features/finance/finance';
import NotFoundError from '@/features/errors/NotFoundError';

const appLoader: ProtectedLoader = async () => {
  try {
    const sessionResponse = await getUserSessionQueryFn();
    console.log('apploader firstName');
    return json<ProtectedLoaderData>({ user: sessionResponse.data.user });
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
            element: <AddProductt />,
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
        element: <Categories />,
        handle: { crumb: 'Categories' },
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
        element: <Finance />,
        handle: { crumb: 'Finance' },
      },
    ],
  },
  {
    path: '/login',
    loader: loginLoader,
    element: <SignIn />,
  },
  { path: '*', element: <NotFoundError /> },
]);
