import { useMemo } from 'react';

import type { CartItemHydrated } from '@celebs/shared-types';

import { COD_MAX_LIMIT, SHIPPING_FEE } from '../constants';

import {
  CHECKOUT_FREE_SHIPPING_THRESHOLD,
  formatPrice,
} from '@/features/cart/utils/cart-selectors';

interface CheckoutPricingParams {
  selectedItems: CartItemHydrated[];
  cartItems?: CartItemHydrated[];
  selectedSubtotal: number;
  subtotal: number;
  isLoggedIn: boolean;
  effectiveAddressId?: string | null;
}

export function useCheckoutPricing({
  selectedItems,
  cartItems = [],
  selectedSubtotal,
  subtotal,
  isLoggedIn,
  effectiveAddressId,
}: CheckoutPricingParams) {
  // An empty selection means "nothing chosen", not "everything". Falling back
  // to the whole cart silently billed items the shopper never picked.
  const hasSelection = selectedItems.length > 0;
  const checkoutItems = useMemo(
    () => (hasSelection ? selectedItems : []),
    [hasSelection, selectedItems],
  );

  const itemsCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = hasSelection ? selectedSubtotal : 0;
  const shippingFee =
    itemsSubtotal >= CHECKOUT_FREE_SHIPPING_THRESHOLD || itemsSubtotal === 0 ? 0 : SHIPPING_FEE;
  const grandTotal = itemsSubtotal + shippingFee;
  const isCodDisabled = grandTotal > COD_MAX_LIMIT;
  const blockedItems = checkoutItems.filter((item) => item.isAvailable === false);
  const stockWarning = blockedItems.find((item) => item.stockWarning)?.stockWarning;
  const canPlaceOrder =
    isLoggedIn && !!effectiveAddressId && checkoutItems.length > 0 && blockedItems.length === 0;
  const deliveryCaption =
    shippingFee === 0 ? 'Free delivery applied' : `Incl. Rs. ${formatPrice(shippingFee)} delivery`;

  return {
    checkoutItems,
    itemsCount,
    itemsSubtotal,
    /** The full cart total, kept for callers that still display it. */
    cartSubtotal: subtotal,
    cartItems,
    shippingFee,
    grandTotal,
    isCodDisabled,
    canPlaceOrder,
    blockedItems,
    stockWarning,
    deliveryCaption,
  };
}
