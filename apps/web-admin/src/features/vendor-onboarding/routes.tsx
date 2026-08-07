import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/routes/role-guard';

const OnboardingWizardPage = lazy(() => import('./pages/onboarding-wizard-page'));

export const vendorOnboardingRoutes: RouteObject = {
  path: 'onboarding',
  element: (
    <RoleGuard allowedRoles={['VENDOR']}>
      <OnboardingWizardPage />
    </RoleGuard>
  ),
  handle: { crumb: 'Onboarding' },
};
