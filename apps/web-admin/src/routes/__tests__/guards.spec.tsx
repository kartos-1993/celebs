import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthGuard } from '../auth-guard';
import { BootFallback } from '../boot-fallback';
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
const mockUseMatches = vi.fn(() => []);
vi.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  useMatches: () => mockUseMatches(),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
}));

vi.mock('@/components/page-loader', () => ({
  FullscreenLoader: ({ variant }: { variant?: string }) => (
    <div data-testid="fullscreen-loader" data-variant={variant ?? 'page'} />
  ),
  PageLoader: () => <div>Loading...</div>,
}));

type GuardElement = React.ReactElement<{
  to?: string;
  children?: React.ReactNode;
  variant?: string;
}>;

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

  it('renders the table skeleton variant declared by the deepest matched route', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/products/manage', search: '' });
    mockUseMatches.mockReturnValue([
      { handle: { crumb: 'Home' } },
      { handle: { crumb: 'Products' } },
      { handle: { crumb: 'Manage Product', skeleton: 'table' } },
    ]);

    const result = AuthGuard({ children: <div>Dashboard Content</div> }) as GuardElement;
    expect(result.props.variant).toBe('table');
  });

  it('falls back to the neutral page skeleton when no matched route declares one', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/finance/payouts', search: '' });
    mockUseMatches.mockReturnValue([{ handle: { crumb: 'Home' } }, { handle: undefined }]);

    const result = AuthGuard({ children: <div>Dashboard Content</div> }) as GuardElement;
    expect(result.props.variant).toBe('page');
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

  it('renders nothing while the session check is pending on public routes', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/login' });

    const result = GuestGuard({ children: <div>Login Form</div> });
    expect(result).toBeNull();
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

describe('BootFallback', () => {
  it('renders nothing on public paths while the router initializes', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login' },
      writable: true,
    });
    expect(BootFallback()).toBeNull();
  });

  it('renders the app skeleton on protected paths while the router initializes', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/products/manage' },
      writable: true,
    });
    const result = BootFallback() as GuardElement;
    expect(result).not.toBeNull();
  });
});
