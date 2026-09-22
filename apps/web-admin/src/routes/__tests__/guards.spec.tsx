import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthGuard } from '../auth-guard';
import { BootFallback } from '../boot-fallback';
import { DashboardIndex } from '../dashboard-index';
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
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useLocation: () => mockUseLocation(),
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
  };
});

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

  it('renders the table skeleton variant declared by the destination route', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/products/manage', search: '' });

    const result = AuthGuard({ children: <div>Dashboard Content</div> }) as GuardElement;
    expect(result.props.variant).toBe('table');
  });

  it('renders the form skeleton variant on form destinations', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/account/profile', search: '' });

    const result = AuthGuard({ children: <div>Dashboard Content</div> }) as GuardElement;
    expect(result.props.variant).toBe('form');
  });

  it('falls back to the neutral page skeleton when no matched route declares one', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    mockUseLocation.mockReturnValue({ pathname: '/definitely-not-a-route', search: '' });

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

describe('DashboardIndex', () => {
  it('sends an admin to the products section, never to itself', () => {
    mockUseAuthContext.mockReturnValue({
      user: { role: 'SUPERADMIN', isEmailVerified: true },
      isLoading: false,
    });

    const result = DashboardIndex() as GuardElement;
    expect(result.props.to).toBe('/products');
  });

  it('sends logged-out visits to the login page', () => {
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: false });

    const result = DashboardIndex() as GuardElement;
    expect(result.props.to).toBe('/login');
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

  it('renders nothing on the root path while the router initializes', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true,
    });
    expect(BootFallback()).toBeNull();
  });

  it('renders the destination silhouette on app paths while the router initializes', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/products/manage' },
      writable: true,
    });
    const result = BootFallback() as GuardElement;
    expect(result).not.toBeNull();
    expect(result.props.variant).toBe('table');
  });

  it('agrees with AuthGuard on every route that declares a skeleton', () => {
    const cases: Array<{ pathname: string; variant: string }> = [
      { pathname: '/products/manage', variant: 'table' },
      { pathname: '/orders', variant: 'table' },
      { pathname: '/users', variant: 'table' },
      { pathname: '/products/new', variant: 'form' },
      { pathname: '/account/profile', variant: 'form' },
      { pathname: '/onboarding', variant: 'form' },
      { pathname: '/marketing/combos', variant: 'table' },
      { pathname: '/finance', variant: 'dashboard' },
      { pathname: '/definitely-not-a-route', variant: 'page' },
    ];
    mockUseAuthContext.mockReturnValue({ user: null, isLoading: true });
    for (const { pathname, variant } of cases) {
      mockUseLocation.mockReturnValue({ pathname, search: '' });
      Object.defineProperty(window, 'location', { value: { pathname }, writable: true });
      const guardResult = AuthGuard({ children: <div>X</div> }) as GuardElement;
      const bootResult = BootFallback() as GuardElement;
      expect(guardResult.props.variant).toBe(variant);
      expect(bootResult.props.variant).toBe(variant);
    }
  });
});
