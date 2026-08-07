import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const AccountSettingsPage = lazy(() => import('./pages/account-settings-page'));
const SettingsPage = lazy(() => import('./pages/settings-page'));

export const accountRoutes: RouteObject = {
  path: 'account',
  handle: { crumb: 'Account' },
  children: [
    {
      path: 'profile',
      element: <AccountSettingsPage />,
      handle: { crumb: 'Profile Settings' },
    },
    {
      path: 'security',
      element: <SettingsPage />,
      handle: { crumb: 'Security' },
    },
  ],
};
