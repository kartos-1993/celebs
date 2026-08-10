import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { UAParser } from 'ua-parser-js';
import { format, formatDistanceToNowStrict, isPast } from 'date-fns';
import { Smartphone, Laptop, LucideIcon } from 'lucide-react';
import useAuth from '@/hooks/use-auth';
import { UserData } from '@/types';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { axiosClient } from '@/lib/axios/axios-client';
import { setAuthCallbacks, broadcastLogout } from '@/lib/axios/interceptors';

// ─── Session Parsing Utility ──────────────────────────────────────────────────
export interface SessionInfo {
  deviceType: string;
  browser: string;
  os: string;
  timeAgo: string;
  icon: LucideIcon;
}

export const parseSession = (userAgent: string, createdAt: string): SessionInfo => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const deviceType = result.device.type || 'Desktop';
  const browser = `${result.browser.name}` || 'Web';
  const os = `${result.os.name} ${result.os.version}`;
  const icon = deviceType === 'mobile' ? Smartphone : Laptop;

  const formattedAt = isPast(new Date(createdAt))
    ? `${formatDistanceToNowStrict(new Date(createdAt))} ago`
    : format(new Date(createdAt), 'd MMM, yyyy');

  return {
    deviceType,
    browser,
    os,
    timeAgo: formattedAt,
    icon,
  };
};

// ─── Context Shape ────────────────────────────────────────────────────────────
type AuthContextType = {
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

const defaultAuthContext: AuthContextType = {
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

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

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

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
};
