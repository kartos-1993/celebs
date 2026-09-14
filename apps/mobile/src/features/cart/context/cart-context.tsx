import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

import { useAuth } from '@/features/auth/context/auth-context';

export type { CartContextType };

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isLoggedIn) {
      getGuestSessionId().then((id) => {
        if (isMounted) {
          setGuestId(id);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  const activeSessionId = isLoggedIn ? null : guestId;
  const isQueryEnabled = isLoggedIn || Boolean(guestId);
  const {
    data: cart = null,
    isLoading,
    error: queryError,
    refetch,
  } = useCartQuery(activeSessionId, { enabled: isQueryEnabled });
  const addToCartMutation = useAddToCartMutation(activeSessionId);
  const updateQuantityMutation = useUpdateCartQuantityMutation(activeSessionId);
  const removeItemMutation = useRemoveCartItemMutation(activeSessionId);
  const clearCartMutation = useClearCartMutation(activeSessionId);

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
    async (input: AddToCartInput): Promise<void> => {
      await addToCartMutation.mutateAsync(input);
    },
    [addToCartMutation],
  );

  const handleUpdateQuantity = useCallback(
    async (itemId: string, newQuantity: number): Promise<void> => {
      if (newQuantity <= 0) {
        await removeItemMutation.mutateAsync(itemId);
        return;
      }
      await updateQuantityMutation.mutateAsync({ itemId, quantity: newQuantity });
    },
    [removeItemMutation, updateQuantityMutation],
  );

  const handleRemoveItem = useCallback(
    async (id: string): Promise<void> => {
      await removeItemMutation.mutateAsync(id);
    },
    [removeItemMutation],
  );
  const handleClearCart = useCallback(async (): Promise<void> => {
    await clearCartMutation.mutateAsync();
  }, [clearCartMutation]);
  const handleRefreshCart = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);
  const handleToggleAll = useCallback(() => toggleAllSelection(items), [toggleAllSelection, items]);

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
    toggleAllSelection: handleToggleAll,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
