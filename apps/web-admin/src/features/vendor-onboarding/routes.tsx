import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

import { RoleGuard } from '@/routes/role-guard';

const OnboardingWizardPage = lazy(() => import('./pages/onboarding-wizard-page'));

export const vendorOnboardingRoutes: RouteObject = {
  index: true,
  element: (
    <RoleGuard allowedRoles={['VENDOR']}>
      <OnboardingWizardPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Onboarding' },
};
