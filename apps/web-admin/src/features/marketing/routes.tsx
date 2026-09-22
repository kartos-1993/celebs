import { Navigate, Outlet, RouteObject } from 'react-router-dom';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const marketingRoutes: RouteObject = {
  path: 'marketing',
  element: (
    <RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
      <Outlet />
    </RoleGuard>
  ),
  handle: { crumb: 'Marketing' },
  children: [
    { index: true, element: <Navigate to="campaigns" replace /> },
    {
      path: 'preview',
      ...pageRoute(() => import('./pages/sdui-preview-page')),
      handle: { title: 'SDUI Storefront Preview', crumb: 'SDUI Preview' },
    },
    {
      path: 'campaigns',
      children: [
        {
          path: '',
          ...pageRoute(() => import('./pages/campaign-list-page')),
          handle: { title: 'Festival Campaigns', crumb: 'Campaigns' },
        },
        {
          path: 'new',
          ...pageRoute(() => import('./pages/campaign-form-page')),
          handle: { title: 'Create Campaign', crumb: 'New Campaign' },
        },
        {
          path: ':id',
          ...pageRoute(() => import('./pages/campaign-form-page')),
          handle: { title: 'Edit Campaign', crumb: 'Edit Campaign' },
        },
      ],
    },
    {
      path: 'combos',
      children: [
        {
          path: '',
          ...pageRoute(() => import('./pages/combo-list-page')),
          handle: { title: 'Generic Combo Bundles', crumb: 'Combos' },
        },
        {
          path: 'new',
          ...pageRoute(() => import('./pages/combo-form-page')),
          handle: { title: 'Create Combo Bundle', crumb: 'New Combo' },
        },
        {
          path: ':id',
          ...pageRoute(() => import('./pages/combo-form-page')),
          handle: { title: 'Edit Combo Bundle', crumb: 'Edit Combo' },
        },
      ],
    },
  ],
};
