import type { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const reviewRoutes: RouteObject = {
  path: 'reviews',
  handle: { crumb: 'Customer Reviews' },
  children: [
    {
      index: true,
      ...pageRoute(
        () => import('./pages/review-moderation-page'),
        (Page) => (
          <RoleGuard requiredPermission={Permission.PRODUCT_VIEW}>
            <Page />
          </RoleGuard>
        ),
      ),
    },
  ],
};
