import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';

import { CartApiService } from '../services/cart-service';

/**
 * Storage key used by AsyncStorage for offline cart persistence.
 * Note: We intentionally use AsyncStorage instead of SecureStore here because
 * SecureStore has a strict 2KB limit on Android that crashes when carts contain
 * multiple items with rich metadata (names, images, variant descriptions).
 */
const CART_STORAGE_KEY = 'celebs_cart_storage_v2';
const GUEST_SESSION_KEY = 'celebs_guest_session_id_v2';

interface SelectionSlice {
  selectedItemIds: string[];
  selectionInitialized: boolean;
}

export interface CartState extends SelectionSlice {
  cart: CartResponse | null;
  sessionId: string | null;
  loading: boolean;
  error: string | null;

  // Session & Lifecycle
  initSession: () => Promise<string>;
  startFreshGuestSession: () => Promise<void>;
  mergeGuestCartOnLogin: () => Promise<void>;

  // Cart Operations
  fetchCart: () => Promise<void>;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  // Selection Management
  toggleItemSelection: (itemId: string) => void;
  setItemsSelection: (itemIds: string[], selected: boolean) => void;
  toggleAllSelection: () => void;
}

/**
 * Ensures item selection state remains consistent when the cart updates.
 * Any selected item ID that no longer exists in the new items array is pruned.
 */
function syncSelection(prev: SelectionSlice, items: CartItemHydrated[]): SelectionSlice {
  if (!prev.selectionInitialized) {
    return {
      selectedItemIds: items.map((item) => item.id),
      selectionInitialized: true,
    };
  }

  const validIds = new Set(items.map((item) => item.id));
  return {
    selectedItemIds: prev.selectedItemIds.filter((id) => validIds.has(id)),
    selectionInitialized: true,
  };
}

/**
 * Normalizes error messages from varying API error shapes into clean, human-readable strings.
 */
function normalizeCartError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'object' && err !== null) {
    const candidate = err as { message?: unknown; error?: unknown };
    if (typeof candidate.message === 'string' && candidate.message) {
      return candidate.message;
    }
    if (typeof candidate.error === 'string' && candidate.error) {
      return candidate.error;
    }
  }
  return fallback;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      sessionId: null,
      loading: false,
      error: null,
      selectedItemIds: [],
      selectionInitialized: false,

      /**
       * Resolves or initializes an unguessable guest session ID.
       * Persisted in AsyncStorage to survive app restarts while staying within limits.
       */
      initSession: async () => {
        const existing = get().sessionId;
        if (existing) {
          return existing;
        }

        try {
          let stored = await AsyncStorage.getItem(GUEST_SESSION_KEY);
          if (!stored) {
            stored = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            await AsyncStorage.setItem(GUEST_SESSION_KEY, stored);
          }
          set({ sessionId: stored });
          return stored;
        } catch (err) {
          console.warn('[CartStore] Failed to access guest session storage:', err);
          const fallback = `guest_fallback_${Date.now()}`;
          set({ sessionId: fallback });
          return fallback;
        }
      },

      /**
       * Fetches the latest authoritative cart from the server.
       * Local AsyncStorage ensures data is available immediately on mount;
       * this background fetch reconciles live stock levels and pricing.
       */
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
          const msg = normalizeCartError(err, 'Failed to sync cart with server');
          // Do not wipe locally persisted cart on network failure — gracefully degrade
          set({ error: msg, loading: false });
        }
      },

      /**
       * Adds an item to the cart.
       * Reconciles new items into the active selection automatically.
       */
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
          const msg = normalizeCartError(err, 'Failed to add item to cart');
          set({ error: msg, loading: false });
          throw new Error(msg);
        }
      },

      /**
       * Updates the quantity of an existing item in the cart.
       */
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
          const msg = normalizeCartError(err, 'Failed to update item quantity');
          set({ error: msg, loading: false });
          throw new Error(msg);
        }
      },

      /**
       * Removes an item from the cart.
       */
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
          const msg = normalizeCartError(err, 'Failed to remove item from cart');
          set({ error: msg, loading: false });
          throw new Error(msg);
        }
      },

      /**
       * Clears all items from the cart.
       */
      clearCart: async () => {
        const session = get().sessionId || (await get().initSession());
        set({ loading: true, error: null });

        try {
          const updatedCart = await CartApiService.clearCart(session);
          set({
            cart: updatedCart,
            selectedItemIds: [],
            selectionInitialized: false,
            loading: false,
            error: null,
          });
        } catch {
          // Fallback local clear if network fails or endpoint returns non-200
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
            error: null,
          });
        }
      },

      /**
       * Toggles selection for a single cart item.
       */
      toggleItemSelection: (itemId: string) =>
        set((state) => ({
          selectedItemIds: state.selectedItemIds.includes(itemId)
            ? state.selectedItemIds.filter((id) => id !== itemId)
            : [...state.selectedItemIds, itemId],
        })),

      /**
       * Selects or deselects multiple items simultaneously.
       */
      setItemsSelection: (itemIds: string[], selected: boolean) =>
        set((state) => {
          const currentSet = new Set(state.selectedItemIds);
          for (const id of itemIds) {
            if (selected) {
              currentSet.add(id);
            } else {
              currentSet.delete(id);
            }
          }
          return { selectedItemIds: Array.from(currentSet) };
        }),

      /**
       * Toggles selection for all items currently in the cart.
       */
      toggleAllSelection: () =>
        set((state) => {
          const items = state.cart?.items || [];
          const allSelected =
            items.length > 0 && items.every((item) => state.selectedItemIds.includes(item.id));
          return { selectedItemIds: allSelected ? [] : items.map((item) => item.id) };
        }),

      /**
       * Invoked upon successful login.
       * Synchronizes locally stored guest items with the authenticated server cart (POST /cart/sync).
       * Rotates the guest session identifier and loads the merged cart.
       */
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
          console.warn('[CartStore] Guest cart sync after login failed:', err);
          // Best-effort: still load the authenticated user's authoritative server cart
          await get().fetchCart();
        }
      },

      /**
       * Rotates the guest identity and clears local state.
       * Invoked on logout to ensure user data does not bleed into the next guest session.
       */
      startFreshGuestSession: async () => {
        try {
          await AsyncStorage.removeItem(GUEST_SESSION_KEY);
        } catch {
          // Storage removal failure is non-fatal; initSession mints a fresh ID
        }

        set({
          cart: null,
          sessionId: null,
          selectedItemIds: [],
          selectionInitialized: false,
          error: null,
        });

        await get().initSession();
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      /**
       * Partialize: Only persist durable state across app launches.
       * Ephemeral UI flags (loading, error) are deliberately excluded to prevent stale states.
       */
      partialize: (state) => ({
        cart: state.cart,
        sessionId: state.sessionId,
        selectedItemIds: state.selectedItemIds,
        selectionInitialized: state.selectionInitialized,
      }),
    },
  ),
);
