import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';

import { CartApiService } from '../services/cart-service';

const GUEST_SESSION_KEY = 'celebs_guest_session_id';

interface SelectionSlice {
  selectedItemIds: string[];
  selectionInitialized: boolean;
}

interface CartState extends SelectionSlice {
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
  toggleItemSelection: (itemId: string) => void;
  setItemsSelection: (itemIds: string[], selected: boolean) => void;
  toggleAllSelection: () => void;
  mergeGuestCartOnLogin: () => Promise<void>;
  startFreshGuestSession: () => Promise<void>;
}

const syncSelection = (prev: SelectionSlice, items: CartItemHydrated[]): SelectionSlice => {
  if (!prev.selectionInitialized) {
    return { selectedItemIds: items.map((item) => item.id), selectionInitialized: true };
  }
  const validIds = new Set(items.map((item) => item.id));
  return {
    selectedItemIds: prev.selectedItemIds.filter((id) => validIds.has(id)),
    selectionInitialized: true,
  };
};

/**
 * The api client rejects with a plain ApiError object (not an Error instance),
 * so instanceof checks alone would discard server messages like
 * "Requested quantity (5) exceeds available stock (2)".
 */
function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null) {
    const maybe = err as { message?: unknown };
    if (typeof maybe.message === 'string' && maybe.message) return maybe.message;
  }
  return fallback;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  sessionId: null,
  loading: false,
  error: null,
  selectedItemIds: [],
  selectionInitialized: false,

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
      set((state) => ({
        ...syncSelection(state, fetchedCart.items),
        cart: fetchedCart,
        loading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to fetch cart');
      set({ error: msg, loading: false });
    }
  },

  addToCart: async (input: AddToCartInput) => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const updatedCart = await CartApiService.addToCart(input, session);
      const previousIds = new Set((get().cart?.items || []).map((item) => item.id));
      const newItemIds = updatedCart.items
        .filter((item) => !previousIds.has(item.id))
        .map((item) => item.id);
      set((state) => {
        const synced = syncSelection(state, updatedCart.items);
        return {
          ...synced,
          selectedItemIds: [...new Set([...synced.selectedItemIds, ...newItemIds])],
          cart: updatedCart,
          loading: false,
          error: null,
        };
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to add item to cart');
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
      set((state) => ({
        ...syncSelection(state, updatedCart.items),
        cart: updatedCart,
        loading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to update item quantity');
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  removeItem: async (itemId: string) => {
    const session = get().sessionId || (await get().initSession());
    set({ loading: true, error: null });
    try {
      const updatedCart = await CartApiService.removeCartItem(itemId, session);
      set((state) => ({
        ...syncSelection(state, updatedCart.items),
        cart: updatedCart,
        loading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Failed to remove item');
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
        selectedItemIds: [],
        selectionInitialized: false,
        loading: false,
      });
    }
  },

  toggleItemSelection: (itemId) =>
    set((state) => ({
      selectedItemIds: state.selectedItemIds.includes(itemId)
        ? state.selectedItemIds.filter((id) => id !== itemId)
        : [...state.selectedItemIds, itemId],
    })),

  setItemsSelection: (itemIds, selected) =>
    set((state) => {
      const ids = new Set(state.selectedItemIds);
      for (const id of itemIds) {
        if (selected) {
          ids.add(id);
        } else {
          ids.delete(id);
        }
      }
      return { selectedItemIds: [...ids] };
    }),

  toggleAllSelection: () =>
    set((state) => {
      const items = state.cart?.items || [];
      const allSelected =
        items.length > 0 && items.every((item) => state.selectedItemIds.includes(item.id));
      return { selectedItemIds: allSelected ? [] : items.map((item) => item.id) };
    }),

  // Called right after a successful login: pushes guest cart items into the
  // user's server-side cart (POST /cart/sync), then rotates the guest identity
  // and loads the authenticated user cart. Server ignores x-session-id once a
  // Bearer token is present, so the merged cart resolves by userId.
  mergeGuestCartOnLogin: async () => {
    const guestItems = (get().cart?.items || []).map((item) => ({
      productId: item.productId,
      colorVariantName: item.colorVariantName,
      size: item.size,
      quantity: item.quantity,
    }));

    await get().startFreshGuestSession();

    if (guestItems.length === 0) {
      await get().fetchCart();
      return;
    }

    try {
      const mergedCart = await CartApiService.syncCart({ items: guestItems });
      set((state) => ({
        ...syncSelection(state, mergedCart.items),
        cart: mergedCart,
        loading: false,
        error: null,
      }));
    } catch (err: unknown) {
      // Sync is best-effort — out-of-stock lines are skipped server-side;
      // still surface the user's authoritative server cart afterwards.
      console.warn('Guest cart sync after login failed:', err);
      await get().fetchCart();
    }
  },

  startFreshGuestSession: async () => {
    try {
      await SecureStore.deleteItemAsync(GUEST_SESSION_KEY);
    } catch {
      // Storage failure is non-fatal — initSession mints a fresh id regardless
    }
    set({ cart: null, selectedItemIds: [], selectionInitialized: false, error: null });
    await get().initSession();
  },
}));
