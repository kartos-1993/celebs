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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user;
  const role = user?.role;

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
  return context || defaultAuthContext;
};
