import { createContext, useContext } from "react";
import useAuth from "@/hooks/use-auth";
import { UserData } from "@/types";

// Define the context shape
type AuthContextType = {
  user?: UserData;
  error: any;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data, error, isLoading, isFetching, refetch } = useAuth();
  const user = data?.data?.user;

  return (
    <AuthContext.Provider
      value={{ user, error, isLoading, isFetching, refetch }}
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
