import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const optionSetRoutes: RouteObject = {
  path: '/option-sets',
  ...pageRoute(
    () => import('./pages/option-sets-page'),
    (Page) => (
      <RoleGuard requiredPermission={Permission.CATALOG_MANAGE}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Option Sets' },
};
