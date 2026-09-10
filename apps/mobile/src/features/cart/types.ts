import type { AddToCartInput, CartItemHydrated, CartResponse } from '@celebs/shared-types';

export interface CartContextType {
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
