import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';
import { Permission } from '@celebs/rbac';

const BannersPage = lazy(() => import('./pages/banners-page'));
const LayoutEditorPage = lazy(() => import('./pages/layout-editor-page'));

export const platformSettingsRoutes: RouteObject[] = [
  {
    path: 'platform-settings/banners',
    element: (
      <RoleGuard requiredPermission={Permission.PLATFORM_MANAGE}>
        <BannersPage />
      </RoleGuard>
    ),
    handle: { crumb: 'Banner Settings' },
  },
  {
    path: 'platform-settings/layout',
    element: (
      <RoleGuard requiredPermission={Permission.PLATFORM_MANAGE}>
        <LayoutEditorPage />
      </RoleGuard>
    ),
    handle: { title: 'Home Layout Editor', crumb: 'Layout Editor' },
  },
];
