import type { CartResponse } from '@celebs/shared-types';

import {
  CART_QUERY_KEYS,
  clearGuestSessionId,
  getGuestSessionId,
  rotateGuestSessionId,
  syncCartApi,
} from '../api';
import { useCartUiStore } from '../store/use-cart-ui-store';

import { queryClient } from '@/lib/react-query/query-client';

/**
 * Single-flight guard: overlapping login calls (double-tap, re-rendered
 * Google effect) must share one POST. A second POST with the same payload
 * would sum quantities again on the backend (existingQty + requestedQty).
 */
let syncInFlight: Promise<void> | null = null;

/**
 * Invoked upon successful login / registration.
 * Merges items from guest session into the authenticated user's cart in PostgreSQL.
 */
export async function syncGuestCartOnLogin(): Promise<void> {
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    try {
      const guestSessionId = await getGuestSessionId();
      const guestCart = queryClient.getQueryData<CartResponse>(
        CART_QUERY_KEYS.detail(guestSessionId),
      );

      const guestItems = (guestCart?.items || []).map((item) => ({
        productId: item.productId,
        colorVariantName: item.colorVariantName,
        size: item.size,
        quantity: item.quantity,
      }));

      const mergedCart = await syncCartApi({
        sessionId: guestSessionId,
        items: guestItems,
      });

      queryClient.setQueryData(CART_QUERY_KEYS.detail(null), mergedCart);
      queryClient.removeQueries({ queryKey: CART_QUERY_KEYS.detail(guestSessionId) });
    } catch (err) {
      console.warn('[CartSync] Failed to sync guest cart on login:', err);
    } finally {
      await rotateGuestSessionId();
      await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
    }
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

/**
 * Invoked upon logout.
 * Purges the guest session key and query cache so user data never bleeds into subsequent sessions.
 */
export async function resetGuestSessionOnLogout(): Promise<void> {
  try {
    await clearGuestSessionId();
  } catch (err) {
    console.warn('[CartSync] Failed to clear guest session on logout:', err);
  } finally {
    const newGuestId = await rotateGuestSessionId();
    useCartUiStore.getState().clearSelection();
    queryClient.removeQueries({ queryKey: CART_QUERY_KEYS.all });
    queryClient.setQueryData(CART_QUERY_KEYS.detail(newGuestId), {
      id: '',
      userId: null,
      sessionId: newGuestId,
      items: [],
      subtotal: 0,
      itemCount: 0,
      hasStockIssues: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
