import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/api/client';
import { useCart } from '@/features/cart/context/cart-context';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isEmailVerified: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginWithGoogle: (data: { email: string; name: string; picture?: string; googleId?: string }) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'auth_access_token';
const USER_KEY = 'auth_user_profile';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore stored session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUserJson = await SecureStore.getItemAsync(USER_KEY);

        if (storedToken && storedUserJson) {
          setToken(storedToken);
          setUser(JSON.parse(storedUserJson));
        }
      } catch (err) {
        console.warn('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Save session state to SecureStore
  const saveSession = async (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
  };

  // Google 1-Tap Login
  const loginWithGoogle = async (data: { email: string; name: string; picture?: string; googleId?: string }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/google', data, { skipAuth: true });
      const { user: userProfile, accessToken } = response.data.data;
      await saveSession(accessToken, userProfile);
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email/Password Login
  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password }, { skipAuth: true });
      const { user: userProfile, accessToken } = response.data.data;
      await saveSession(accessToken, userProfile);
    } finally {
      setIsLoading(false);
    }
  };

  // User Registration
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register', { name, email, password }, { skipAuth: true });
      // After registration, log the user in automatically or return
      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/auth/logout').catch(() => {});
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user && !!token,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
