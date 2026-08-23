import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { RoleGuard } from '../role-guard';
import { Permission } from '@celebs/rbac';
import { AuthContext, defaultAuthContext } from '@/context/auth-provider';
import ForbiddenError from '@/features/errors/forbidden-error';


const ForbiddenInspector = () => {
  const location = useLocation();
  return (
    <div data-testid="forbidden-inspector">
      <span data-testid="state-from">{location.state?.from}</span>
      <span data-testid="state-perm">{String(location.state?.requiredPermissions)}</span>
      <span data-testid="state-role">{location.state?.userRole}</span>
    </div>
  );
};

describe('RoleGuard Integration Tests', () => {
  const renderWithAuth = (user: unknown, permissions?: Permission | Permission[]) => {
    return render(
      <AuthContext.Provider
        value={{
          ...defaultAuthContext,
          user: user as never,
          isLoading: false,
          isAuthenticated: Boolean(user),
          role: (user as { role?: string })?.role,
        }}
      >
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <RoleGuard permissions={permissions}>
                  <div data-testid="protected-content">Access Granted</div>
                </RoleGuard>
              }
            />
            <Route path="/403" element={<ForbiddenInspector />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
  };

  it('renders protected content when Staff has the required permission', () => {
    renderWithAuth(
      { id: 'staff-1', role: 'STAFF', permissions: [Permission.PRODUCT_VIEW] },
      Permission.PRODUCT_VIEW,
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects Staff to /403 with context state when lacking required permission', () => {
    renderWithAuth(
      { id: 'staff-1', role: 'STAFF', permissions: [Permission.ORDER_VIEW] },
      Permission.PRODUCT_VIEW,
    );
    expect(screen.getByTestId('forbidden-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('state-from')).toHaveTextContent('/protected');
    expect(screen.getByTestId('state-perm')).toHaveTextContent(Permission.PRODUCT_VIEW);
    expect(screen.getByTestId('state-role')).toHaveTextContent('STAFF');
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('allows SUPERADMIN access unconditionally', () => {
    renderWithAuth(
      { id: 'admin-1', role: 'SUPERADMIN', permissions: [] },
      [Permission.PLATFORM_MANAGE, Permission.PRODUCT_DELETE],
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});

describe('ForbiddenError Component Tests', () => {
  it('renders 403 title, access diagnostics, and recovery action buttons', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/403',
            state: {
              from: '/settings/system',
              requiredPermissions: Permission.PLATFORM_MANAGE,
              userRole: 'STAFF',
            },
          },
        ]}
      >
        <Routes>
          <Route path="/403" element={<ForbiddenError />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('403 - Access Denied')).toBeInTheDocument();
    expect(screen.getByText('/settings/system')).toBeInTheDocument();
    expect(screen.getByText(Permission.PLATFORM_MANAGE)).toBeInTheDocument();
    expect(screen.getByText('STAFF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toBeInTheDocument();
  });
});
