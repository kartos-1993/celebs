import { createContext, useContext, useCallback } from 'react';
import useAuth from '@/hooks/use-auth';
import { UserData } from '@/types';
import { useIdleTimer } from '@/hooks/use-idle-timer';
import { apiClient } from '@/lib/axios-client';

// Define the context shape
type AuthContextType = {
  user?: UserData;
  error: any;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user;
  const role = user?.role;

  const isVendor = role === 'VENDOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isStaff = role === 'STAFF';

  const handleIdle = useCallback(async () => {
    if (user) {
      console.warn('User idle for 15 minutes. Logging out for security.');
      try {
        await apiClient.post('/auth/logout');
      } catch (e) {
        console.error('Logout on idle failed:', e);
      } finally {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
  }, [user]);

  // Trigger idle timer (15 minutes)
  useIdleTimer(handleIdle, 15 * 60 * 1000);

  return (
    <AuthContext.Provider
      value={{
        user,
        error,
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
  return context || defaultAuthContext;
};
