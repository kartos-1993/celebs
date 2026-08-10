import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AddToCartInput, CartResponse } from '@celebs/shared-types';
import { CartApiService } from '../services/cart-service';

const GUEST_SESSION_KEY = 'celebs_guest_session_id';

interface CartState {
  cart: CartResponse | null;
  sessionId: string | null;
  loading: boolean;
  error: string | null;

  initSession: () => Promise<string>;
  fetchCart: () => Promise<void>;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  sessionId: null,
  loading: false,
  error: null,

  initSession: async () => {
    try {
      let session = await SecureStore.getItemAsync(GUEST_SESSION_KEY);
      if (!session) {
        session = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await SecureStore.setItemAsync(GUEST_SESSION_KEY, session);
      }
      set({ sessionId: session });
      return session;
    } catch (err) {
      console.warn('Failed to resolve guest session id:', err);
      const fallback = `guest_fallback_${Date.now()}`;
      set({ sessionId: fallback });
      return fallback;
    }
  },

  fetchCart: async () => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const fetchedCart = await CartApiService.getCart(session);
      set({ cart: fetchedCart, loading: false });
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
        session,
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
    } catch {
      // Fallback local clear if API request returns empty or non-200
      set({
        cart: {
          id: 'local_cart',
          userId: null,
          sessionId: session,
          items: [],
          subtotal: 0,
          itemCount: 0,
          hasStockIssues: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        loading: false,
      });
    }
  },
}));
