import type { CartResponse } from '@celebs/shared-types';

import {
  CART_QUERY_KEYS,
  clearGuestSessionId,
  getGuestSessionId,
  rotateGuestSessionId,
  syncCartApi,
} from '../api';

import { queryClient } from '@/lib/react-query/query-client';

/**
 * Invoked upon successful login / registration.
 * Merges items from guest session into the authenticated user's cart in PostgreSQL.
 */
export async function syncGuestCartOnLogin(): Promise<void> {
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

    if (guestItems.length > 0) {
      await syncCartApi({ items: guestItems });
    }
  } catch (err) {
    console.warn('[CartSync] Failed to sync guest cart on login:', err);
  } finally {
    await rotateGuestSessionId();
    await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.all });
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
    await rotateGuestSessionId();
    await queryClient.resetQueries({ queryKey: CART_QUERY_KEYS.all });
  }
}
