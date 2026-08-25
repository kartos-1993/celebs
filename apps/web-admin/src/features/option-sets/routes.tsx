import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { RoleGuard } from '@/routes/role-guard';

const OptionSetsPage = lazy(() => import('./pages/option-sets-page'));

export const optionSetRoutes: RouteObject = {
  path: '/option-sets',
  element: (
    <RoleGuard requiredPermission={Permission.CATALOG_MANAGE}>
      <OptionSetsPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Option Sets' },
};
