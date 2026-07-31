import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AddToCartInput, CartResponse } from '@celebs/shared-types';
import { CartApiService } from '../services/cart-service';

const GUEST_SESSION_KEY = '@celebs_guest_session_id';

interface CartState {
  cart: CartResponse | null;
  loading: boolean;
  error: string | null;
  sessionId: string | undefined;

  // Actions
  initSession: () => Promise<string>;
  fetchCart: () => Promise<void>;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setCart: (cart: CartResponse | null) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  error: null,
  sessionId: undefined,

  setCart: (cart) => set({ cart }),

  initSession: async () => {
    const existingSession = get().sessionId;
    if (existingSession) return existingSession;

    try {
      let storedSession = await AsyncStorage.getItem(GUEST_SESSION_KEY);
      if (!storedSession) {
        storedSession = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(GUEST_SESSION_KEY, storedSession);
      }
      set({ sessionId: storedSession });
      return storedSession;
    } catch {
      const fallbackSession = `guest_${Date.now()}`;
      set({ sessionId: fallbackSession });
      return fallbackSession;
    }
  },

  fetchCart: async () => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const data = await CartApiService.getCart(session);
      set({ cart: data, loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch cart';
      set({ error: msg, loading: false });
    }
  },

  addToCart: async (input: AddToCartInput) => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const updatedCart = await CartApiService.addToCart(input, session);
      set({ cart: updatedCart, loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add item to cart';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  updateQuantity: async (itemId: string, newQuantity: number) => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const updatedCart = await CartApiService.updateCartItem(
        itemId,
        { quantity: newQuantity },
        session
      );
      set({ cart: updatedCart, loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item quantity';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  removeItem: async (itemId: string) => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const updatedCart = await CartApiService.removeCartItem(itemId, session);
      set({ cart: updatedCart, loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove item';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  clearCart: async () => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const updatedCart = await CartApiService.clearCart(session);
      set({ cart: updatedCart, loading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear cart';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },
}));
