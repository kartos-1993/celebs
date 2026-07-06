import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

const TOKEN_KEY = 'celebs_jwt_token';
const USER_KEY = 'celebs_user_profile';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,

  login: async (token: string, user: User) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      set({ token: null, user: null, isAuthenticated: false });
    } catch (e) {
      console.error('Failed to clear auth session:', e);
    }
  },

  initializeAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      
      if (token && userJson) {
        set({
          token,
          user: JSON.parse(userJson),
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
      }
    } catch (e) {
      console.error('Failed to initialize auth session:', e);
      set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
    }
  },
}));
