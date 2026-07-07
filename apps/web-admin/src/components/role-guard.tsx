import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/auth-provider';
import { Role } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading, role } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force onboarding-incomplete vendors to the onboarding wizard
  if (
    role === 'VENDOR' &&
    user.vendorProfile &&
    user.vendorProfile.onboardingStep < 5 &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  // Prevent onboarding-complete vendors from accessing onboarding page
  if (
    role === 'VENDOR' &&
    user.vendorProfile &&
    user.vendorProfile.onboardingStep >= 5 &&
    location.pathname === '/onboarding'
  ) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role as Role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
