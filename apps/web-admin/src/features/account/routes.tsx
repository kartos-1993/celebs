import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const Settings = lazy(() => import('./settings'));
const AccountSettings = lazy(() => import('./account-settings'));

export const accountRoutes: RouteObject = {
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
};
