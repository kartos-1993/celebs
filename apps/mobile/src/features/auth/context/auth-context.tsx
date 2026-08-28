import React, { createContext, useContext, useEffect, useState } from 'react';

import type { AuthContextType, UserProfile } from '../types';
import { clearAuthSession, restoreAuthSession, saveAuthSession } from '../utils/auth-storage';

import { apiClient, setUnauthorizedHandler } from '@/api/client';
import { useCartStore } from '@/features/cart/store/use-cart-store';

export type { UserProfile };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hard 401 resets React and in-memory state
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore stored session on mount
  useEffect(() => {
    async function restore() {
      try {
        const stored = await restoreAuthSession();
        if (stored.token && stored.user) {
          setToken(stored.token);
          setUser(stored.user);
        }
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  const handleSaveSession = async (
    newToken: string,
    newUser: UserProfile,
    refreshToken?: string,
  ) => {
    setToken(newToken);
    setUser(newUser);
    await saveAuthSession(newToken, newUser, refreshToken);
  };

  // Google 1-Tap Login
  const loginWithGoogle = async (data: { idToken: string }) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/google', data, { skipAuth: true });
      const { user: userProfile, accessToken, refreshToken } = response.data.data;
      await handleSaveSession(accessToken, userProfile, refreshToken);
      await useCartStore.getState().mergeGuestCartOnLogin();
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Email/Password Login
  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password }, { skipAuth: true });
      const { user: userProfile, accessToken, refreshToken } = response.data.data;
      await handleSaveSession(accessToken, userProfile, refreshToken);
      await useCartStore.getState().mergeGuestCartOnLogin();
    } finally {
      setIsLoading(false);
    }
  };

  // User Registration
  const register = async (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(
        '/auth/register',
        { name, email, password, confirmPassword: confirmPassword ?? password },
        { skipAuth: true },
      );
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
      await clearAuthSession();
      setToken(null);
      setUser(null);
      await useCartStore.getState().startFreshGuestSession();
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
