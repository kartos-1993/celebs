import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { Permission } from '@celebs/rbac';

import { RoleGuard } from '@/routes/role-guard';

const ReviewModerationPage = lazy(() => import('./pages/review-moderation-page'));

export const reviewRoutes: RouteObject = {
  path: 'reviews',
  handle: { crumb: 'Customer Reviews' },
  children: [
    {
      index: true,
      element: (
        <RoleGuard requiredPermission={Permission.PRODUCT_VIEW}>
          <ReviewModerationPage />
        </RoleGuard>
      ),
    },
  ],
};
