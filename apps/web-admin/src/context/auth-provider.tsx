import React, { createContext, useContext, useCallback, useEffect } from 'react';
import useAuth from '@/hooks/use-auth';
import { UserData } from '@/types';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { axiosClient, setAuthCallbacks, broadcastLogout } from '@/lib/axios';

// ─── Context Shape ────────────────────────────────────────────────────────────
type AuthContextType = {
  user?: UserData;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  role?: string;
  isVendor: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
};

const defaultAuthContext: AuthContextType = {
  user: undefined,
  error: null,
  isLoading: true,
  isFetching: false,
  refetch: () => {},
  role: undefined,
  isVendor: false,
  isAdmin: false,
  isSuperAdmin: false,
  isStaff: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user as UserData | undefined;
  const role = user?.role;

  const isVendor = role === 'VENDOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isStaff = role === 'STAFF';

  // ── Wire Axios interceptor callbacks into React auth state ────────────────
  // This ensures the interceptor can notify the UI on token refresh or expiry
  // without creating a circular dependency.
  useEffect(() => {
    setAuthCallbacks({
      onTokenRefreshed: () => {
        // Refetch the current user so React state stays in sync after a
        // successful silent token refresh.
        refetch();
      },
      onSessionExpired: () => {
        // Nothing extra needed here — the interceptor redirects to /login.
        // If a logout API call is desired, add it here.
      },
    });
  }, [refetch]);

  // ── Idle logout ───────────────────────────────────────────────────────────
  const handleIdle = useCallback(async () => {
    if (user) {
      console.warn('User idle for 15 minutes. Logging out for security.');
      try {
        broadcastLogout();
        await axiosClient.post('/auth/logout');
      } catch (e) {
        console.error('Logout on idle failed:', e);
      } finally {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
  }, [user]);

  // 15-minute idle timer
  useIdleTimer(handleIdle, 15 * 60 * 1000);

  return (
    <AuthContext.Provider
      value={{
        user,
        error: error as Error | null,
        isLoading,
        isFetching,
        refetch,
        role,
        isVendor,
        isAdmin,
        isSuperAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
};
