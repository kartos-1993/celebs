import React, { createContext, ReactNode, useContext, useEffect } from 'react';

import { AddToCartInput, CartResponse } from '@celebs/shared-types';

import { useCartStore } from '../store/use-cart-store';

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
  const {
    cart,
    loading,
    error,
    fetchCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    initSession,
  } = useCartStore();

  useEffect(() => {
    initSession().then(() => {
      fetchCart();
    });
  }, [initSession, fetchCart]);

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
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    // Fallback directly to Zustand store if invoked outside provider
    const store = useCartStore();
    return {
      cart: store.cart,
      loading: store.loading,
      error: store.error,
      itemCount: store.cart?.itemCount || 0,
      subtotal: store.cart?.subtotal || 0,
      addToCart: store.addToCart,
      updateQuantity: store.updateQuantity,
      removeItem: store.removeItem,
      clearCart: store.clearCart,
      refreshCart: store.fetchCart,
    };
  }
  return context;
};
