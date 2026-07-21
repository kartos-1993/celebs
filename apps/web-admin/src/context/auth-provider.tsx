import { createContext, useContext, Context } from "react";
import useAuth from "@/hooks/use-auth";
import { UserData } from "@/types";

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

// Keep context reference stable across Vite HMR hot reloads in development
const globalContexts = (globalThis as any).__contexts || ((globalThis as any).__contexts = {});
const AuthContext: Context<AuthContextType | null> = globalContexts.AuthContext || (globalContexts.AuthContext = createContext<AuthContextType | null>(null));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user;
  const role = user?.role;

  console.log('AuthProvider data:', data);
  console.log('AuthProvider user:', user);
  console.log('AuthProvider role:', role);

  const isVendor = role === 'VENDOR';
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPERADMIN';
  const isStaff = role === 'STAFF';

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
  if (!context) {
    throw new Error("useCurrentUserContext must be used within a AuthProvider");
  }
  return context;
};
