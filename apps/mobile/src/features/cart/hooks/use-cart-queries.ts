import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddComboToCartInput,
  AddToCartInput,
  CartItemHydrated,
  CartResponse,
  SyncCartInput,
} from '@celebs/shared-types';
import { moneyMultiply, moneySum } from '@celebs/shared-utils';

import {
  addComboToCartApi,
  addToCartApi,
  CART_QUERY_KEYS,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  syncCartApi,
  updateCartItemApi,
} from '../api';
import { getUnitPrice } from '../utils/cart-selectors';

/**
 * Local fallback only. The server is the source of truth for the subtotal, so
 * every optimistic write prefers the server figure it already has and only
 * recomputes when the cached response carries none (see applyCartPatch).
 */
function recalculateCartTotals(items: CartItemHydrated[]) {
  // Exact, so this fallback cannot show a total the server would contradict.
  let itemCount = 0;
  for (const item of items) itemCount += item.quantity;

  return {
    subtotal: moneySum(items.map((item) => moneyMultiply(getUnitPrice(item), item.quantity))),
    itemCount,
  };
}

/** Applies a patched item list, keeping the server subtotal when it has one. */
function applyCartPatch(
  cart: CartResponse,
  items: CartItemHydrated[],
  overrides: Partial<Pick<CartResponse, 'subtotal' | 'itemCount' | 'hasStockIssues'>>,
): CartResponse {
  return { ...cart, ...overrides, items };
}

const OPTIMISTIC_ITEM_PREFIX = 'optimistic-';

/**
 * `CartItemHydrated.image` is a REQUIRED field of the shared cart contract, but
 * it is a frozen denormalised snapshot that the cart deliberately never reads:
 * the row thumbnail is resolved live from the product (see
 * `resolveCartLineImage`). The optimistic row therefore has no honest image to
 * put here, and the value is a named constant rather than a bare `image: ''` so
 * the "nothing to show yet" is obvious at the call site.
 */
const NO_LINE_IMAGE = '';

/**
 * Placeholder row for the optimistic add. The cart schema needs a full item
 * shape, but the only facts known before the server replies are the ones the
 * caller submitted — everything else stays empty rather than invented.
 */
function buildOptimisticItem(input: AddToCartInput): CartItemHydrated {
  return {
    id: `${OPTIMISTIC_ITEM_PREFIX}${input.productId}`,
    cartId: '',
    inventoryId: '',
    productId: input.productId,
    productName: '',
    productSlug: '',
    price: 0,
    // Nothing has been priced yet; the optimistic row must not invent a figure.
    unitPrice: 0,
    appliedDiscount: 0,
    colorVariantName: input.colorVariantName,
    colorCode: '',
    image: NO_LINE_IMAGE,
    size: input.size,
    quantity: input.quantity,
    availableStock: 0,
    isAvailable: true,
    createdAt: '',
    updatedAt: '',
  };
}

export function useCartQuery(sessionId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CART_QUERY_KEYS.detail(sessionId),
    queryFn: () => getCartApi(sessionId),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
  });
}

export function useAddToCartMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => CART_QUERY_KEYS.detail(sessionId), [sessionId]);

  return useMutation({
    mutationFn: (input: AddToCartInput) => addToCartApi(input, sessionId),
    onMutate: async (input: AddToCartInput) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      if (previousCart) {
        // Same optimistic shape as update/remove/clear: a placeholder row
        // carrying only what the caller submitted, plus recalculated totals.
        const optimisticItems = [...previousCart.items, buildOptimisticItem(input)];
        queryClient.setQueryData<CartResponse>(
          queryKey,
          applyCartPatch(previousCart, optimisticItems, {
            ...recalculateCartTotals(optimisticItems),
          }),
        );
      }
      return { previousCart };
    },
    onSuccess: (serverCart) => {
      // The server response carries the authoritative subtotal/itemCount, so it
      // replaces the optimistic recompute wholesale.
      queryClient.setQueryData<CartResponse>(queryKey, serverCart);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    },
  });
}

/**
 * Combo adds are not optimistically patched: the server allocates the bundle
 * discount across its lines, so a client-side guess would display prices the
 * server immediately contradicts. The response replaces the cached cart.
 */
export function useAddComboToCartMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => CART_QUERY_KEYS.detail(sessionId), [sessionId]);

  return useMutation({
    mutationFn: (input: AddComboToCartInput) => addComboToCartApi(input, sessionId),
    onSuccess: (serverCart) => {
      queryClient.setQueryData<CartResponse>(queryKey, serverCart);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    },
  });
}

export function useUpdateCartQuantityMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => CART_QUERY_KEYS.detail(sessionId), [sessionId]);

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItemApi(itemId, { quantity }, sessionId),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      if (previousCart) {
        const updatedItems = previousCart.items.map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
        );
        queryClient.setQueryData<CartResponse>(
          queryKey,
          applyCartPatch(previousCart, updatedItems, recalculateCartTotals(updatedItems)),
        );
      }
      return { previousCart };
    },
    onSuccess: (serverCart) => {
      // The server response carries the authoritative subtotal/itemCount, so it
      // replaces the optimistic recompute wholesale.
      queryClient.setQueryData<CartResponse>(queryKey, serverCart);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    },
  });
}

export function useRemoveCartItemMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => CART_QUERY_KEYS.detail(sessionId), [sessionId]);

  return useMutation({
    mutationFn: (itemId: string) => removeCartItemApi(itemId, sessionId),
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      if (previousCart) {
        const updatedItems = previousCart.items.filter((item) => item.id !== itemId);
        queryClient.setQueryData<CartResponse>(
          queryKey,
          applyCartPatch(previousCart, updatedItems, recalculateCartTotals(updatedItems)),
        );
      }
      return { previousCart };
    },
    onSuccess: (serverCart) => {
      // The server response carries the authoritative subtotal/itemCount, so it
      // replaces the optimistic recompute wholesale.
      queryClient.setQueryData<CartResponse>(queryKey, serverCart);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    },
  });
}

export function useClearCartMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => CART_QUERY_KEYS.detail(sessionId), [sessionId]);

  return useMutation({
    mutationFn: () => clearCartApi(sessionId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      if (previousCart) {
        queryClient.setQueryData<CartResponse>(
          queryKey,
          applyCartPatch(previousCart, [], { subtotal: 0, itemCount: 0 }),
        );
      }
      return { previousCart };
    },
    onSuccess: (serverCart) => {
      // The server response carries the authoritative subtotal/itemCount, so it
      // replaces the optimistic recompute wholesale.
      queryClient.setQueryData<CartResponse>(queryKey, serverCart);
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(queryKey, context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    },
  });
}

export function useSyncCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SyncCartInput) => syncCartApi(input),
    onSuccess: (mergedCart) => {
      queryClient.setQueryData(CART_QUERY_KEYS.detail(null), mergedCart);
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    },
  });
}
