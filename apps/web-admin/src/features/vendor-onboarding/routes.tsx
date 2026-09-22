import { RouteObject } from 'react-router-dom';

import { pageRoute } from '@/routes/page-route';
import { RoleGuard } from '@/routes/role-guard';

export const vendorOnboardingRoutes: RouteObject = {
  index: true,
  ...pageRoute(
    () => import('./pages/onboarding-wizard-page'),
    (Page) => (
      <RoleGuard allowedRoles={['VENDOR']}>
        <Page />
      </RoleGuard>
    ),
  ),
  handle: { crumb: 'Onboarding' },
};
