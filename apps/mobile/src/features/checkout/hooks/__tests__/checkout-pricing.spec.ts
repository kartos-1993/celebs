import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  type CartItemHydrated,
  COMMERCE_POLICY_DEFAULTS,
  type CommercePolicy,
} from '@celebs/shared-types';

import { useCheckoutPricing } from '../use-checkout-pricing';

const HOOK_SRC = readFileSync(
  fileURLToPath(new URL('../use-checkout-pricing.ts', import.meta.url)),
  'utf8',
);

function item(overrides: Partial<CartItemHydrated> = {}): CartItemHydrated {
  return {
    id: 'i1',
    cartId: 'c1',
    inventoryId: 'inv1',
    productId: 'p1',
    productName: 'Tee',
    productSlug: 'tee',
    price: 1000,
    discountedPrice: 800,
    colorVariantName: 'Red',
    colorCode: '#f00',
    image: 'img',
    size: 'M',
    quantity: 1,
    availableStock: 10,
    isAvailable: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function renderPricing(args: Parameters<typeof useCheckoutPricing>[0]) {
  const holder: { out: ReturnType<typeof useCheckoutPricing> | null } = { out: null };
  function Probe() {
    holder.out = useCheckoutPricing(args);
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  if (!holder.out) throw new Error('hook did not render');
  return holder.out;
}

interface PricingBase {
  selectedItems: CartItemHydrated[];
  cartItems: CartItemHydrated[];
  isLoggedIn: boolean;
  effectiveAddressId?: string | null;
  policy: CommercePolicy;
  freeShippingThreshold: number;
}

function pricingBase(): PricingBase {
  return {
    selectedItems: [item()],
    cartItems: [],
    isLoggedIn: true,
    effectiveAddressId: 'a1',
    policy: COMMERCE_POLICY_DEFAULTS,
    freeShippingThreshold: 3000,
  };
}

describe('useCheckoutPricing', () => {
  it('uses selected items + selectedSubtotal when selection is non-empty', () => {
    const selected = [item({ id: 's1', quantity: 2 })];
    const cart = [item({ id: 'c1', quantity: 9 })];
    const r = renderPricing({
      selectedItems: selected,
      cartItems: cart,
      selectedSubtotal: 1600,
      subtotal: 9000,
      isLoggedIn: true,
      effectiveAddressId: 'a1',
      policy: COMMERCE_POLICY_DEFAULTS,
      freeShippingThreshold: 3000,
    });
    expect(r.checkoutItems).toBe(selected);
    expect(r.itemsSubtotal).toBe(1600);
    expect(r.itemsCount).toBe(2);
  });

  it('empty selection prices NOTHING instead of billing the whole cart', () => {
    // An empty selection means "nothing chosen", not "everything".
    const cart = [item({ id: 'c1', quantity: 2 })];
    const r = renderPricing({
      selectedItems: [],
      cartItems: cart,
      selectedSubtotal: 0,
      subtotal: 1600,
      isLoggedIn: true,
      effectiveAddressId: 'a1',
      policy: COMMERCE_POLICY_DEFAULTS,
      freeShippingThreshold: 3000,
    });
    expect(r.checkoutItems).toEqual([]);
    expect(r.itemsSubtotal).toBe(0);
    expect(r.itemsCount).toBe(0);
    expect(r.canPlaceOrder).toBe(false);
    // The untouched cart figures stay available for callers that show them.
    expect(r.cartSubtotal).toBe(1600);
  });

  it('reads the numbers from the policy the server published, not local constants', () => {
    // The hardcoded copies are gone: the app has no threshold of its own to fall
    // out of step with the server.
    expect(HOOK_SRC).not.toContain('SHIPPING_FEE');
    expect(HOOK_SRC).not.toContain('COD_MAX_LIMIT');
    expect(HOOK_SRC).not.toContain('CHECKOUT_FREE_SHIPPING_THRESHOLD');
    expect(HOOK_SRC).toContain('resolveShippingFee');
    expect(HOOK_SRC).toContain('isCodAllowed');
  });

  it('follows a policy the admin changed, with no app release', () => {
    const raisedFee: CommercePolicy = { codMaxLimit: 12000, flatShippingFee: 300 };
    const base = pricingBase();

    // 4000 clears the in-valley threshold of 3000.
    const before = renderPricing({ ...base, selectedSubtotal: 4000, subtotal: 0 });
    expect(before.shippingFee).toBe(0);

    // The same order, sent to a zone whose threshold is 8000. The threshold is
    // the destination's, delivered by the server, not a number in the bundle.
    const after = renderPricing({
      ...base,
      selectedSubtotal: 4000,
      subtotal: 0,
      policy: raisedFee,
      freeShippingThreshold: 8000,
    });
    expect(after.shippingFee).toBe(300);
    expect(after.grandTotal).toBe(4300);
  });

  it('prefers the server-reported total when the whole cart is selected', () => {
    // Optimistic reconciliation: the server's own figure wins, so the shopper
    // never sees a locally-derived number for the same order.
    const base = pricingBase();
    const r = renderPricing({
      ...base,
      selectedSubtotal: 4000,
      subtotal: 4000,
      serverShippingFee: 150,
      serverTotal: 4150,
    });

    expect(r.shippingFee).toBe(150);
    expect(r.grandTotal).toBe(4150);
  });

  it('keeps the local figure while a partial selection is priced', () => {
    const base = pricingBase();
    const r = renderPricing({
      ...base,
      selectedSubtotal: 1000,
      subtotal: 4000,
      serverShippingFee: 0,
      serverTotal: 4000,
    });

    expect(r.grandTotal).toBe(1150);
  });

  it('free shipping at/above threshold or zero subtotal; fee otherwise', () => {
    const base = pricingBase();
    expect(renderPricing({ ...base, selectedSubtotal: 3000, subtotal: 0 }).shippingFee).toBe(0);
    expect(renderPricing({ ...base, selectedSubtotal: 0, subtotal: 0 }).shippingFee).toBe(0);
    const r = renderPricing({ ...base, selectedSubtotal: 2999, subtotal: 0 });
    expect(r.shippingFee).toBe(150);
    expect(r.grandTotal).toBe(3149);
  });

  it('disables COD above max limit and gates order on login/address/availability', () => {
    const base = pricingBase();
    expect(renderPricing({ ...base, selectedSubtotal: 5001, subtotal: 0 }).isCodDisabled).toBe(
      true,
    );
    expect(renderPricing({ ...base, selectedSubtotal: 5000, subtotal: 0 }).isCodDisabled).toBe(
      false,
    );
    expect(renderPricing({ ...base, selectedSubtotal: 100, subtotal: 0 }).canPlaceOrder).toBe(true);
    expect(
      renderPricing({ ...base, selectedSubtotal: 100, subtotal: 0, isLoggedIn: false })
        .canPlaceOrder,
    ).toBe(false);
    expect(
      renderPricing({ ...base, selectedSubtotal: 100, subtotal: 0, effectiveAddressId: null })
        .canPlaceOrder,
    ).toBe(false);
    const blocked = [item({ isAvailable: false, stockWarning: 'Low' })];
    const rb = renderPricing({
      selectedItems: blocked,
      cartItems: [],
      selectedSubtotal: 800,
      subtotal: 0,
      isLoggedIn: true,
      effectiveAddressId: 'a1',
      policy: COMMERCE_POLICY_DEFAULTS,
      freeShippingThreshold: 3000,
    });
    expect(rb.canPlaceOrder).toBe(false);
    expect(rb.blockedItems).toHaveLength(1);
    expect(rb.stockWarning).toBe('Low');
  });

  it('delivery caption uses formatPrice 2-decimal style (pinned inconsistency)', () => {
    // @todo-fix: formatPrice inconsistency — caption renders
    // "Rs. 150.00" while combo surfaces render integer NPR strings.
    const r = renderPricing({
      selectedItems: [item()],
      cartItems: [],
      selectedSubtotal: 100,
      subtotal: 0,
      isLoggedIn: true,
      effectiveAddressId: 'a1',
      policy: COMMERCE_POLICY_DEFAULTS,
      freeShippingThreshold: 3000,
    });
    expect(r.deliveryCaption).toContain('150');
    const free = renderPricing({
      selectedItems: [item()],
      cartItems: [],
      selectedSubtotal: 3000,
      subtotal: 0,
      isLoggedIn: true,
      effectiveAddressId: 'a1',
      policy: COMMERCE_POLICY_DEFAULTS,
      freeShippingThreshold: 3000,
    });
    expect(free.deliveryCaption).toBe('Free delivery applied');
  });
});
