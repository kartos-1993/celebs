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
   * Free-delivery threshold as the server quoted it. Supplied by the API rather
   * than read from a local copy, so the figure the shopper sees is the one the
   * server will apply.
   */
  freeShippingThreshold: number;
  /**
   * Delivery and total as the server last reported them for the whole cart.
   * Shown in preference to a local figure when the selection covers the entire
   * cart; checkout remains the authority and recomputes regardless.
   */
  serverShippingFee?: number;
  serverTotal?: number;
  /**
   * True when the server had to quote conservatively because it could not resolve
   * a delivery zone for this cart. The figure is still server-derived, but it is
   * not the price this order will be charged, and the caption must not present it
   * as one.
   */
  serverDeliveryIsEstimate?: boolean;
}

export function useCheckoutPricing({
  selectedItems,
  cartItems = [],
  selectedSubtotal,
  subtotal,
  isLoggedIn,
  effectiveAddressId,
  policy,
  freeShippingThreshold,
  serverShippingFee,
  serverTotal,
  serverDeliveryIsEstimate = false,
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
      : resolveShippingFee(itemsSubtotal, policy, freeShippingThreshold);

  const grandTotal =
    coversWholeCart && typeof serverTotal === 'number' ? serverTotal : itemsSubtotal + shippingFee;

  const isCodDisabled = !isCodAllowed(grandTotal, policy);
  const blockedItems = checkoutItems.filter((item) => item.isAvailable === false);
  const stockWarning = blockedItems.find((item) => item.stockWarning)?.stockWarning;
  const canPlaceOrder =
    isLoggedIn && !!effectiveAddressId && checkoutItems.length > 0 && blockedItems.length === 0;
  // Without a resolved zone the cart quoted the conservative threshold, so 'free'
  // is a possibility rather than a promise. Saying 'Free delivery applied' there
  // is the exact surprise this flag exists to prevent: the customer is told the
  // delivery is free and is then charged for it at checkout.
  const deliveryCaption = serverDeliveryIsEstimate
    ? shippingFee === 0
      ? 'Free delivery may apply'
      : `Est. Rs. ${formatPrice(shippingFee)} delivery`
    : shippingFee === 0
      ? 'Free delivery applied'
      : `Incl. Rs. ${formatPrice(shippingFee)} delivery`;

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
