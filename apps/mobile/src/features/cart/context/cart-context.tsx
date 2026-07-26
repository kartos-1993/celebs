import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';
import { CartApiService } from '../services/cart-service';

const GUEST_SESSION_KEY = '@celebs_guest_session_id';
const LOCAL_GUEST_CART_KEY = '@celebs_guest_cart_items';

interface CartContextType {
  cart: CartResponse | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  // Initialize guest session ID or load existing
  useEffect(() => {
    const initSession = async () => {
      try {
        let storedSession = await AsyncStorage.getItem(GUEST_SESSION_KEY);
        if (!storedSession) {
          storedSession = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem(GUEST_SESSION_KEY, storedSession);
        }
        setSessionId(storedSession);
      } catch {
        setSessionId(`guest_${Date.now()}`);
      }
    };
    initSession();
  }, []);

  // Fetch cart
  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CartApiService.getCart(sessionId);
      setCart(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch cart';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId !== undefined) {
      refreshCart();
    }
  }, [sessionId, refreshCart]);

  // Add item
  const addToCart = async (input: AddToCartInput): Promise<void> => {
    setLoading(true);
    try {
      const updatedCart = await CartApiService.addToCart(input, sessionId);
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Update quantity
  const updateQuantity = async (itemId: string, newQuantity: number): Promise<void> => {
    setLoading(true);
    try {
      const updatedCart = await CartApiService.updateCartItem(
        itemId,
        { quantity: newQuantity },
        sessionId
      );
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update item quantity';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Remove item
  const removeItem = async (itemId: string): Promise<void> => {
    setLoading(true);
    try {
      const updatedCart = await CartApiService.removeCartItem(itemId, sessionId);
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove item';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async (): Promise<void> => {
    setLoading(true);
    try {
      const updatedCart = await CartApiService.clearCart(sessionId);
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to clear cart';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        subtotal,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
