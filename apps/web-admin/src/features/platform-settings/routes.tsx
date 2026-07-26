import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const Banners = lazy(() => import('./banners'));

export const platformSettingsRoutes: RouteObject = {
  path: 'platform-settings/banners',
  element: (
    <RoleGuard allowedRoles={['SUPERADMIN']}>
      <Banners />
    </RoleGuard>
  ),
  handle: { crumb: 'Banner Settings' },
};
