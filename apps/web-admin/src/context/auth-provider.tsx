import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';

import {
  hasPermissionAccess,
  type Permission,
  type PermissionMode,
  type PermissionRequirement,
} from '@celebs/rbac';
import { logger } from '@celebs/shared-utils';

import { deriveAuthPersona, type Mode } from './auth-persona';

import useAuth from '@/hooks/use-auth';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { axiosClient } from '@/lib/axios/axios-client';
import { broadcastLogout, setAuthCallbacks } from '@/lib/axios/interceptors';
import { UserData } from '@/types';

export type { Mode };

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
  isPlatform: boolean;
  isSeller: boolean;
  mode: Mode;
  storeId?: string;
  permissions: Permission[];
  hasPermission: (required?: PermissionRequirement, mode?: PermissionMode) => boolean;
};

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
  isPlatform: false,
  isSeller: false,
  mode: 'vendor',
  storeId: undefined,
  permissions: [],
  hasPermission: () => false,
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user as UserData | undefined;
  const isAuthenticated = Boolean(user);

  const persona = useMemo(() => deriveAuthPersona(user), [user]);

  const hasPermission = useCallback(
    (required?: PermissionRequirement, mode: PermissionMode = 'ANY') => {
      return hasPermissionAccess(persona.role || 'CUSTOMER', user?.permissions, required, mode);
    },
    [persona.role, user?.permissions],
  );

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
  // Platform admins get 30-minute idle window; vendors/staff get 15-minute window
  const idleTimeoutMs = persona.isPlatform ? 30 * 60 * 1000 : 15 * 60 * 1000;

  const handleIdle = useCallback(async () => {
    if (user) {
      const minutes = idleTimeoutMs / (60 * 1000);
      logger.warn(`User idle for ${minutes} minutes. Logging out for security.`);
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
  }, [user, idleTimeoutMs]);

  useIdleTimer(handleIdle, idleTimeoutMs);

  return (
    <AuthContext.Provider
      value={{
        user,
        error: error as Error | null,
        isLoading,
        isFetching,
        isAuthenticated,
        refetch,
        ...persona,
        hasPermission,
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
