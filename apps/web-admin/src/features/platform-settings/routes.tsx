import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const BannersPage = lazy(() => import('./pages/banners-page'));

export const platformSettingsRoutes: RouteObject = {
  path: 'platform-settings/banners',
  element: (
    <RoleGuard requiredPermission={Permission.PLATFORM_MANAGE}>
      <BannersPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Banner Settings' },
};
