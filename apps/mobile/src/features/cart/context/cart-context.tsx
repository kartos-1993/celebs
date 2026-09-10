import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AddToCartInput } from '@celebs/shared-types';

import { getGuestSessionId } from '../api';
import {
  useAddToCartMutation,
  useCartQuery,
  useClearCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartQuantityMutation,
} from '../hooks/use-cart-queries';
import { useCartUiStore } from '../store/use-cart-ui-store';
import type { CartContextType } from '../types';
import { computeTotals } from '../utils/cart-selectors';

export type { CartContextType };

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    getGuestSessionId().then((id) => setSessionId(id));
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  const { data: cart = null, isLoading, error: queryError, refetch } = useCartQuery(sessionId);
  const addToCartMutation = useAddToCartMutation(sessionId);
  const updateQuantityMutation = useUpdateCartQuantityMutation(sessionId);
  const removeItemMutation = useRemoveCartItemMutation(sessionId);
  const clearCartMutation = useClearCartMutation(sessionId);

  const {
    selectedItemIds,
    toggleItemSelection,
    setItemsSelection,
    toggleAllSelection,
    syncSelection,
  } = useCartUiStore();

  const items = useMemo(() => cart?.items || [], [cart]);

  useEffect(() => {
    if (items.length > 0) {
      syncSelection(items);
    }
  }, [items, syncSelection]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds],
  );

  const totals = useMemo(() => computeTotals(selectedItems), [selectedItems]);
  const isAllSelected =
    items.length > 0 && items.every((item) => selectedItemIds.includes(item.id));

  const handleAddToCart = useCallback(
    async (input: AddToCartInput) => {
      await addToCartMutation.mutateAsync(input);
    },
    [addToCartMutation],
  );

  const handleUpdateQuantity = useCallback(
    async (itemId: string, newQuantity: number) => {
      const existing = debounceTimers.current.get(itemId);
      if (existing) clearTimeout(existing);

      if (newQuantity <= 0) {
        await removeItemMutation.mutateAsync(itemId);
        return;
      }

      const timer = setTimeout(() => {
        updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
        debounceTimers.current.delete(itemId);
      }, 350);
      debounceTimers.current.set(itemId, timer);
    },
    [removeItemMutation, updateQuantityMutation],
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      await removeItemMutation.mutateAsync(itemId);
    },
    [removeItemMutation],
  );

  const handleClearCart = useCallback(async () => {
    await clearCartMutation.mutateAsync();
  }, [clearCartMutation]);

  const handleRefreshCart = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleToggleAllSelection = useCallback(() => {
    toggleAllSelection(items);
  }, [toggleAllSelection, items]);

  const value: CartContextType = {
    cart,
    loading: isLoading,
    error: queryError ? (queryError as Error).message || 'Failed to load cart' : null,
    itemCount: cart?.itemCount || 0,
    subtotal: cart?.subtotal || 0,
    selectedItemIds,
    selectedItems,
    selectedCount: totals.count,
    selectedSubtotal: totals.total,
    selectedOriginalSubtotal: totals.originalTotal,
    selectedSavings: totals.savings,
    selectedSavingsPercent: totals.savingsPercent,
    isAllSelected,
    addToCart: handleAddToCart,
    updateQuantity: handleUpdateQuantity,
    removeItem: handleRemoveItem,
    clearCart: handleClearCart,
    refreshCart: handleRefreshCart,
    toggleItemSelection,
    setItemsSelection,
    toggleAllSelection: handleToggleAllSelection,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
