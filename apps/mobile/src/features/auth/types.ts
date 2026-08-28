export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isEmailVerified: boolean;
  avatar?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginWithGoogle: (data: { idToken: string }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}
