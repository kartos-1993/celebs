import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { logger } from '@celebs/shared-utils';
import useAuth from '@/hooks/use-auth';
import { UserData } from '@/types';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { axiosClient } from '@/lib/axios/axios-client';
import { setAuthCallbacks, broadcastLogout } from '@/lib/axios/interceptors';
// ─── Context Shape ────────────────────────────────────────────────────────────
export type AuthContextType = {
  user?: UserData;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
  role?: string;
  isVendor: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components
export const defaultAuthContext: AuthContextType = {
  user: undefined,
  error: null,
  isLoading: true,
  isFetching: false,
  isAuthenticated: false,
  refetch: () => {},
  role: undefined,
  isVendor: false,
  isAdmin: false,
  isSuperAdmin: false,
  isStaff: false,
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user as UserData | undefined;
  const isAuthenticated = Boolean(user);
  const role = user?.role;

  const isVendor = role === 'VENDOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isStaff = role === 'STAFF';

  // ── Wire Axios interceptor callbacks into React auth state ────────────────
  useEffect(() => {
    setAuthCallbacks({
      onTokenRefreshed: () => {
        refetch();
      },
      onSessionExpired: () => {
        // Interceptor redirects to /login on session expiry
      },
    });
  }, [refetch]);

  // ── Idle logout ───────────────────────────────────────────────────────────
  const handleIdle = useCallback(async () => {
    if (user) {
      logger.warn('User idle for 15 minutes. Logging out for security.');
      try {
        broadcastLogout();
        await axiosClient.post('/auth/logout');
      } catch (e) {
        logger.error({ error: e }, 'Logout on idle failed');
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
        isAuthenticated,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
};
