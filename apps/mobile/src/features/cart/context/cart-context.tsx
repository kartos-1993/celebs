import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';

import { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';

import { useCartStore } from '../store/use-cart-store';
import { computeTotals } from '../utils/cart-selectors';

interface CartContextType {
  cart: CartResponse | null;
  loading: boolean;
  error: string | null;
  itemCount: number;
  subtotal: number;
  selectedItemIds: string[];
  selectedItems: CartItemHydrated[];
  selectedCount: number;
  selectedSubtotal: number;
  selectedOriginalSubtotal: number;
  selectedSavings: number;
  selectedSavingsPercent: number;
  isAllSelected: boolean;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (itemId: string, newQuantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  toggleItemSelection: (itemId: string) => void;
  setItemsSelection: (itemIds: string[], selected: boolean) => void;
  toggleAllSelection: () => void;
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
    selectedItemIds,
    toggleItemSelection,
    setItemsSelection,
    toggleAllSelection,
  } = useCartStore();

  useEffect(() => {
    initSession().then(() => {
      fetchCart();
    });
  }, [initSession, fetchCart]);

  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;

  const items = useMemo(() => cart?.items || [], [cart]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds],
  );
  const totals = useMemo(() => computeTotals(selectedItems), [selectedItems]);
  const isAllSelected =
    items.length > 0 && items.every((item) => selectedItemIds.includes(item.id));

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        subtotal,
        selectedItemIds,
        selectedItems,
        selectedCount: totals.count,
        selectedSubtotal: totals.total,
        selectedOriginalSubtotal: totals.originalTotal,
        selectedSavings: totals.savings,
        selectedSavingsPercent: totals.savingsPercent,
        isAllSelected,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart: fetchCart,
        toggleItemSelection,
        setItemsSelection,
        toggleAllSelection,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  const store = useCartStore();
  if (!context) {
    // Fallback directly to Zustand store if invoked outside provider
    const items = store.cart?.items || [];
    const selectedItems = items.filter((item) => store.selectedItemIds.includes(item.id));
    const totals = computeTotals(selectedItems);
    return {
      cart: store.cart,
      loading: store.loading,
      error: store.error,
      itemCount: store.cart?.itemCount || 0,
      subtotal: store.cart?.subtotal || 0,
      selectedItemIds: store.selectedItemIds,
      selectedItems,
      selectedCount: totals.count,
      selectedSubtotal: totals.total,
      selectedOriginalSubtotal: totals.originalTotal,
      selectedSavings: totals.savings,
      selectedSavingsPercent: totals.savingsPercent,
      isAllSelected:
        items.length > 0 && items.every((item) => store.selectedItemIds.includes(item.id)),
      addToCart: store.addToCart,
      updateQuantity: store.updateQuantity,
      removeItem: store.removeItem,
      clearCart: store.clearCart,
      refreshCart: store.fetchCart,
      toggleItemSelection: store.toggleItemSelection,
      setItemsSelection: store.setItemsSelection,
      toggleAllSelection: store.toggleAllSelection,
    };
  }
  return context;
};
