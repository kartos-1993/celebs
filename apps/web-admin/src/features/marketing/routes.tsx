import { lazy } from 'react';
import { Navigate, Outlet, RouteObject } from 'react-router-dom';

import { RoleGuard } from '@/routes/role-guard';

const CampaignListPage = lazy(() => import('./pages/campaign-list-page'));
const CampaignFormPage = lazy(() => import('./pages/campaign-form-page'));
const ComboListPage = lazy(() => import('./pages/combo-list-page'));
const ComboFormPage = lazy(() => import('./pages/combo-form-page'));
const SDUIPagePreview = lazy(() => import('./pages/sdui-preview-page'));

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
      element: <SDUIPagePreview />,
      handle: { title: 'SDUI Storefront Preview', crumb: 'SDUI Preview' },
    },
    {
      path: 'campaigns',
      children: [
        {
          path: '',
          element: <CampaignListPage />,
          handle: { title: 'Festival Campaigns', crumb: 'Campaigns' },
        },
        {
          path: 'new',
          element: <CampaignFormPage />,
          handle: { title: 'Create Campaign', crumb: 'New Campaign' },
        },
        {
          path: ':id',
          element: <CampaignFormPage />,
          handle: { title: 'Edit Campaign', crumb: 'Edit Campaign' },
        },
      ],
    },
    {
      path: 'combos',
      children: [
        {
          path: '',
          element: <ComboListPage />,
          handle: { title: 'Generic Combo Bundles', crumb: 'Combos' },
        },
        {
          path: 'new',
          element: <ComboFormPage />,
          handle: { title: 'Create Combo Bundle', crumb: 'New Combo' },
        },
        {
          path: ':id',
          element: <ComboFormPage />,
          handle: { title: 'Edit Combo Bundle', crumb: 'Edit Combo' },
        },
      ],
    },
  ],
};
