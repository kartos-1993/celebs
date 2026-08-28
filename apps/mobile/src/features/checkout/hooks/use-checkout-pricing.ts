import { useMemo } from 'react';

import type { CartItemHydrated } from '@celebs/shared-types';

import { COD_MAX_LIMIT, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../constants';

import { formatPrice } from '@/features/cart/utils/cart-selectors';

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
  const checkoutItems = useMemo(
    () => (selectedItems.length > 0 ? selectedItems : cartItems),
    [selectedItems, cartItems],
  );

  const itemsCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = selectedItems.length > 0 ? selectedSubtotal : subtotal;
  const shippingFee =
    itemsSubtotal >= FREE_SHIPPING_THRESHOLD || itemsSubtotal === 0 ? 0 : SHIPPING_FEE;
  const grandTotal = itemsSubtotal + shippingFee;
  const isCodDisabled = grandTotal > COD_MAX_LIMIT;
  const canPlaceOrder = isLoggedIn && !!effectiveAddressId && checkoutItems.length > 0;
  const deliveryCaption =
    shippingFee === 0 ? 'Free delivery applied' : `Incl. Rs. ${formatPrice(shippingFee)} delivery`;

  return {
    checkoutItems,
    itemsCount,
    itemsSubtotal,
    shippingFee,
    grandTotal,
    isCodDisabled,
    canPlaceOrder,
    deliveryCaption,
  };
}
