import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const platformSettingsRoutes: RouteObject[] = [
  {
    path: 'platform-settings/banners',
    ...pageRoute(
      () => import('./pages/banners-page'),
      (Page) => (
        <RoleGuard requiredPermission={Permission.PLATFORM_MANAGE}>
          <Page />
        </RoleGuard>
      ),
    ),
    handle: { crumb: 'Banner Settings', skeleton: 'table' },
  },
  {
    path: 'platform-settings/layout',
    ...pageRoute(
      () => import('./pages/layout-editor-page'),
      (Page) => (
        <RoleGuard requiredPermission={Permission.PLATFORM_MANAGE}>
          <Page />
        </RoleGuard>
      ),
    ),
    handle: { title: 'Home Layout Editor', crumb: 'Layout Editor', skeleton: 'page' },
  },
];
