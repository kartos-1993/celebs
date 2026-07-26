import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { RoleGuard } from '@/components/role-guard';

const OnboardingWizard = lazy(() => import('./onboarding-wizard'));

export const vendorOnboardingRoutes: RouteObject = {
  path: 'onboarding',
  element: (
    <RoleGuard allowedRoles={['VENDOR']}>
      <OnboardingWizard />
    </RoleGuard>
  ),
  handle: { crumb: 'Onboarding' },
};
