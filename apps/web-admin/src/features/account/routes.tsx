import { RouteObject } from 'react-router-dom';

import { pageRoute } from '@/routes/page-route';

export const accountRoutes: RouteObject = {
  path: 'account',
  handle: { crumb: 'Account' },
  children: [
    {
      path: 'profile',
      ...pageRoute(() => import('./pages/account-settings-page')),
      handle: { crumb: 'Profile Settings' },
    },
    {
      path: 'security',
      ...pageRoute(() => import('./pages/settings-page')),
      handle: { crumb: 'Security' },
    },
  ],
};
