import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const BannersPage = lazy(() => import('./pages/banners-page'));

export const platformSettingsRoutes: RouteObject = {
  path: 'platform-settings/banners',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <BannersPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Banner Settings' },
};
