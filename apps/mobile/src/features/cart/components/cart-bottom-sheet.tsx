import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useCart } from '../context/cart-context';
import { FREE_SHIPPING_THRESHOLD } from '../utils/cart-selectors';

import { styles } from './cart-bottom-sheet.styles';
import { CartCheckoutBar } from './cart-checkout-bar';
import { CartHeader } from './cart-header';
import { CartItemsSection } from './cart-items-section';
import { CartPromoBanner } from './cart-promo-banner';

import { BottomSheet } from '@/components/bottom-sheet';

interface CartBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function CartBottomSheet({ visible, onClose }: CartBottomSheetProps) {
  const router = useRouter();
  const {
    itemCount,
    selectedItems,
    selectedCount,
    selectedSubtotal,
    selectedOriginalSubtotal,
    selectedSavings,
    selectedSavingsPercent,
    isAllSelected,
    toggleAllSelection,
    updateQuantity,
    removeItem,
  } = useCart();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, quantity);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  const footer = useMemo(
    () => (
      <View style={styles.footerGroup}>
        <CartPromoBanner
          savings={selectedSavings}
          savingsPercent={selectedSavingsPercent}
          freeShippingRemaining={Math.max(0, FREE_SHIPPING_THRESHOLD - selectedSubtotal)}
        />
        <CartCheckoutBar
          itemCount={selectedCount}
          total={selectedSubtotal}
          originalTotal={selectedOriginalSubtotal}
          disabled={selectedItems.length === 0}
          onCheckout={handleCheckout}
        />
      </View>
    ),
    [
      selectedSavings,
      selectedSavingsPercent,
      selectedSubtotal,
      selectedOriginalSubtotal,
      selectedCount,
      selectedItems.length,
    ],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      heightRatio={0.92}
      accessibilityLabel="Cart"
      header={
        <CartHeader
          variant="sheet"
          itemCount={itemCount}
          isAllSelected={isAllSelected}
          onToggleAll={toggleAllSelection}
          onClose={onClose}
        />
      }
      footer={footer}
    >
      <CartItemsSection
        updatingId={updatingId}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
      />
    </BottomSheet>
  );
}
