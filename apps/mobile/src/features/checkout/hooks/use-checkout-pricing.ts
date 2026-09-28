import { useMemo } from 'react';

import type { CartItemHydrated, CommercePolicy } from '@celebs/shared-types';
import { isCodAllowed, resolveShippingFee } from '@celebs/shared-types';

import { formatPrice } from '@/features/cart/utils/cart-selectors';

interface CheckoutPricingParams {
  selectedItems: CartItemHydrated[];
  cartItems?: CartItemHydrated[];
  selectedSubtotal: number;
  subtotal: number;
  isLoggedIn: boolean;
  effectiveAddressId?: string | null;
  policy: CommercePolicy;
  /**
   * Delivery and total as the server last reported them for the whole cart.
   * Shown in preference to a local figure when the selection covers the entire
   * cart; checkout remains the authority and recomputes regardless.
   */
  serverShippingFee?: number;
  serverTotal?: number;
}

export function useCheckoutPricing({
  selectedItems,
  cartItems = [],
  selectedSubtotal,
  subtotal,
  isLoggedIn,
  effectiveAddressId,
  policy,
  serverShippingFee,
  serverTotal,
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

  // The whole cart is selected, so the server's own figure is the same order and
  // is preferred; it is the number that will actually be charged. Otherwise the
  // shared rule produces an immediate, policy-consistent figure while the
  // shopper is still choosing, and checkout reconciles on submit.
  const coversWholeCart = hasSelection && itemsSubtotal === subtotal;
  const shippingFee =
    coversWholeCart && typeof serverShippingFee === 'number'
      ? serverShippingFee
      : resolveShippingFee(itemsSubtotal, policy);

  const grandTotal =
    coversWholeCart && typeof serverTotal === 'number' ? serverTotal : itemsSubtotal + shippingFee;

  const isCodDisabled = !isCodAllowed(grandTotal, policy);
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
