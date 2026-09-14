import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loginWithEmailApi, loginWithGoogleApi, logoutApi, registerApi } from '../api/auth-api';
import type { AuthContextType, UserProfile } from '../types';
import { clearAuthSession, restoreAuthSession, saveAuthSession } from '../utils/auth-storage';

import { setUnauthorizedHandler } from '@/api/client';
import {
  resetGuestSessionOnLogout,
  syncGuestCartOnLogin,
} from '@/features/cart/services/cart-sync';

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
        const session = await restoreAuthSession();
        if (session) {
          setToken(session.token);
          setUser(session.user);
        }
      } catch {
        await clearAuthSession();
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  // Sync state & persist to SecureStore (stable identity so Google
  // auth effect with [response, loginWithGoogle] deps doesn't re-fire).
  const handleSaveSession = useCallback(
    async (newToken: string, newUser: UserProfile, refreshToken?: string) => {
      setToken(newToken);
      setUser(newUser);
      await saveAuthSession(newToken, newUser, refreshToken);
    },
    [],
  );

  // Google 1-Tap Login
  const loginWithGoogle = useCallback(
    async (data: { idToken: string }) => {
      setIsLoading(true);
      try {
        const { user: userProfile, accessToken, refreshToken } = await loginWithGoogleApi(data);
        await handleSaveSession(accessToken, userProfile, refreshToken);
        await syncGuestCartOnLogin();
      } finally {
        setIsLoading(false);
      }
    },
    [handleSaveSession],
  );

  // Standard Email/Password Login
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const {
          user: userProfile,
          accessToken,
          refreshToken,
        } = await loginWithEmailApi(email, password);
        await handleSaveSession(accessToken, userProfile, refreshToken);
        await syncGuestCartOnLogin();
      } finally {
        setIsLoading(false);
      }
    },
    [handleSaveSession],
  );

  // User Registration
  const register = useCallback(
    async (name: string, email: string, password: string, confirmPassword?: string) => {
      setIsLoading(true);
      try {
        await registerApi({ name, email, password, confirmPassword });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch (err) {
      console.warn('[AuthContext] Remote logout error:', err);
    } finally {
      await resetGuestSessionOnLogout();
      await clearAuthSession();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: !!user && !!token,
      isLoading,
      loginWithGoogle,
      loginWithEmail,
      register,
      logout,
    }),
    [user, token, isLoading, loginWithGoogle, loginWithEmail, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
