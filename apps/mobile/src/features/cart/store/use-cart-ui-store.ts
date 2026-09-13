import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CartItemHydrated } from '@celebs/shared-types';

interface CartUiState {
  selectedItemIds: string[];
  selectionInitialized: boolean;
  toggleItemSelection: (itemId: string) => void;
  setItemsSelection: (itemIds: string[], selected: boolean) => void;
  toggleAllSelection: (items: CartItemHydrated[]) => void;
  syncSelection: (items: CartItemHydrated[]) => void;
  clearSelection: () => void;
}

export const useCartUiStore = create<CartUiState>()(
  persist(
    (set) => ({
      selectedItemIds: [],
      selectionInitialized: false,

      toggleItemSelection: (itemId: string) =>
        set((state) => ({
          selectedItemIds: state.selectedItemIds.includes(itemId)
            ? state.selectedItemIds.filter((id) => id !== itemId)
            : [...state.selectedItemIds, itemId],
        })),

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

      toggleAllSelection: (items: CartItemHydrated[]) =>
        set((state) => {
          const allSelected =
            items.length > 0 && items.every((item) => state.selectedItemIds.includes(item.id));
          return {
            selectedItemIds: allSelected ? [] : items.map((item) => item.id),
          };
        }),

      syncSelection: (items: CartItemHydrated[]) =>
        set((state) => {
          if (!state.selectionInitialized) {
            return {
              selectedItemIds: items.map((item) => item.id),
              selectionInitialized: true,
            };
          }
          const validIds = new Set(items.map((item) => item.id));
          const filtered = state.selectedItemIds.filter((id) => validIds.has(id));
          return {
            selectedItemIds: filtered.length > 0 ? filtered : items.map((item) => item.id),
          };
        }),

      clearSelection: () =>
        set({
          selectedItemIds: [],
          selectionInitialized: false,
        }),
    }),
    {
      name: 'celebs_cart_selection_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
