import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthGuard } from '../auth-guard';

const mockUseAuthContext = vi.fn();
vi.mock('@/context/auth-provider', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const mockUseLocation = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => mockUseLocation(),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
}));

vi.mock('@/components/page-loader', () => ({
  FullscreenLoader: () => <div>Loading...</div>,
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
