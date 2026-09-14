import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthGuard } from '../auth-guard';
import { GuestGuard } from '../guest-guard';

const mockUseAuthContext = vi.fn();
vi.mock('@/context/auth-provider', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const mockUseSetupStatus = vi.fn();
vi.mock('@/features/auth/hooks/use-auth-queries', () => ({
  useSetupStatus: () => mockUseSetupStatus(),
}));

const mockUseLocation = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
}));

vi.mock('@/components/page-loader', () => ({
  FullscreenLoader: () => <div>Loading...</div>,
  PageLoader: () => <div>Loading...</div>,
}));

type GuardElement = React.ReactElement<{ to?: string; children?: React.ReactNode }>;

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect to /login with returnUrl when unauthenticated', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: false });
    mockUseLocation.mockReturnValue({ pathname: '/products/manage', search: '?filter=active' });

    const result = AuthGuard({ children: <div>Protected Content</div> }) as GuardElement;
    expect(result.props.to).toBe('/login?returnUrl=%2Fproducts%2Fmanage%3Ffilter%3Dactive');
  });

  it('should redirect vendor with onboardingStep < 5 to /onboarding', () => {
    mockUseAuthContext.mockReturnValue({
      user: {
        role: 'VENDOR',
        isEmailVerified: true,
        vendorProfile: { onboardingStep: 3 },
      },
      isLoading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '' });

    const result = AuthGuard({ children: <div>Dashboard</div> }) as GuardElement;
    expect(result.props.to).toBe('/onboarding');
  });

  it('should allow vendor with onboardingStep >= 5 and verified email to access dashboard', () => {
    mockUseAuthContext.mockReturnValue({
      user: {
        role: 'VENDOR',
        isEmailVerified: true,
        vendorProfile: { onboardingStep: 5, status: 'APPROVED' },
      },
      isLoading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: '/dashboard', search: '' });

    const result = AuthGuard({ children: <div>Dashboard Content</div> }) as GuardElement;
    expect(result.type).toBe(React.Fragment);
    expect(result.props.children).toEqual(<div>Dashboard Content</div>);
  });
});

describe('GuestGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSetupStatus.mockReturnValue({
      data: { data: { setupRequired: false } },
      isLoading: false,
    });
  });

  it('should render PageLoader while loading', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    const result = GuestGuard({ children: <div>Login Form</div> }) as GuardElement;
    expect(result.type).not.toBe(React.Fragment);
  });

  it('should redirect to /setup-superadmin when setupRequired is true and user is on /login', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: false });
    mockUseSetupStatus.mockReturnValue({
      data: { data: { setupRequired: true } },
      isLoading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    const result = GuestGuard({ children: <div>Login Form</div> }) as GuardElement;
    expect(result.props.to).toBe('/setup-superadmin');
  });

  it('should allow /setup-superadmin through when setupRequired is true', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: false });
    mockUseSetupStatus.mockReturnValue({
      data: { data: { setupRequired: true } },
      isLoading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: '/setup-superadmin' });

    const result = GuestGuard({ children: <div>Setup Wizard</div> }) as GuardElement;
    expect(result.type).toBe(React.Fragment);
    expect(result.props.children).toEqual(<div>Setup Wizard</div>);
  });

  it('should redirect authenticated admin to dashboard', () => {
    mockUseAuthContext.mockReturnValue({
      user: { role: 'SUPERADMIN' },
      isLoading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    const result = GuestGuard({ children: <div>Login Form</div> }) as GuardElement;
    expect(result.props.to).toBe('/');
  });

  it('should allow unauthenticated guest to view /login when setup is complete', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: false });
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    const result = GuestGuard({ children: <div>Login Form</div> }) as GuardElement;
    expect(result.type).toBe(React.Fragment);
    expect(result.props.children).toEqual(<div>Login Form</div>);
  });
});
