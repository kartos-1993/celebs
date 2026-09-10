import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddToCartInput,
  CartItemHydrated,
  CartResponse,
  SyncCartInput,
} from '@celebs/shared-types';

import {
  addToCartApi,
  CART_QUERY_KEYS,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  syncCartApi,
  updateCartItemApi,
} from '../api';

function recalculateCartTotals(items: CartItemHydrated[]) {
  let subtotal = 0;
  let itemCount = 0;
  for (const item of items) {
    const price = item.discountedPrice ?? item.price;
    subtotal += price * item.quantity;
    itemCount += item.quantity;
  }
  return { subtotal, itemCount };
}

export function useCartQuery(sessionId: string | null) {
  return useQuery({
    queryKey: CART_QUERY_KEYS.detail(sessionId),
    queryFn: () => getCartApi(sessionId),
    enabled: sessionId !== null,
    staleTime: 1000 * 30,
  });
}

export function useAddToCartMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = CART_QUERY_KEYS.detail(sessionId);

  return useMutation({
    mutationFn: (input: AddToCartInput) => addToCartApi(input, sessionId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      return { previousCart };
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

export function useUpdateCartQuantityMutation(sessionId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = CART_QUERY_KEYS.detail(sessionId);

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
        const { subtotal, itemCount } = recalculateCartTotals(updatedItems);
        queryClient.setQueryData<CartResponse>(queryKey, {
          ...previousCart,
          items: updatedItems,
          subtotal,
          itemCount,
        });
      }
      return { previousCart };
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
  const queryKey = CART_QUERY_KEYS.detail(sessionId);

  return useMutation({
    mutationFn: (itemId: string) => removeCartItemApi(itemId, sessionId),
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      if (previousCart) {
        const updatedItems = previousCart.items.filter((item) => item.id !== itemId);
        const { subtotal, itemCount } = recalculateCartTotals(updatedItems);
        queryClient.setQueryData<CartResponse>(queryKey, {
          ...previousCart,
          items: updatedItems,
          subtotal,
          itemCount,
        });
      }
      return { previousCart };
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
  const queryKey = CART_QUERY_KEYS.detail(sessionId);

  return useMutation({
    mutationFn: () => clearCartApi(sessionId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousCart = queryClient.getQueryData<CartResponse>(queryKey);
      if (previousCart) {
        queryClient.setQueryData<CartResponse>(queryKey, {
          ...previousCart,
          items: [],
          subtotal: 0,
          itemCount: 0,
        });
      }
      return { previousCart };
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
