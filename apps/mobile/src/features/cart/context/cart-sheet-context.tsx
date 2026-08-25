import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { CartBottomSheet } from '../components/cart-bottom-sheet';

interface CartSheetContextValue {
  isCartSheetOpen: boolean;
  openCartSheet: () => void;
  closeCartSheet: () => void;
}

const CartSheetContext = createContext<CartSheetContextValue | undefined>(undefined);

export function CartSheetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo(
    () => ({
      isCartSheetOpen: isOpen,
      openCartSheet: () => setIsOpen(true),
      closeCartSheet: () => setIsOpen(false),
    }),
    [isOpen],
  );

  return (
    <CartSheetContext.Provider value={value}>
      {children}
      <CartBottomSheet visible={isOpen} onClose={() => setIsOpen(false)} />
    </CartSheetContext.Provider>
  );
}

export function useCartSheet(): CartSheetContextValue {
  const context = useContext(CartSheetContext);
  if (!context) {
    throw new Error('useCartSheet must be used within a CartSheetProvider');
  }
  return context;
}
