import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AddToCartInput,
  CartResponse,
  IApiResponse,
  SyncCartInput,
  UpdateCartItemInput,
} from '@celebs/shared-types';

import { apiClient } from '@/api/client';
import { handleApiResponse } from '@/api/response';

export const CART_QUERY_KEYS = {
  all: ['cart'] as const,
  detail: (sessionId?: string | null) =>
    [...CART_QUERY_KEYS.all, sessionId ?? 'authenticated'] as const,
};

export const GUEST_SESSION_KEY = 'celebs_guest_session_id_v2';

/**
 * Resolves or initializes an unguessable guest session ID.
 * Persisted in AsyncStorage to survive app restarts.
 */
export async function getGuestSessionId(): Promise<string> {
  try {
    let stored = await AsyncStorage.getItem(GUEST_SESSION_KEY);
    if (!stored) {
      stored = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      await AsyncStorage.setItem(GUEST_SESSION_KEY, stored);
    }
    return stored;
  } catch (err) {
    console.warn('[CartApi] Failed to access guest session storage:', err);
    return `guest_fallback_${Date.now()}`;
  }
}

/**
 * Rotates the guest session identifier and returns the newly minted ID.
 */
export async function rotateGuestSessionId(): Promise<string> {
  try {
    const nextSession = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    await AsyncStorage.setItem(GUEST_SESSION_KEY, nextSession);
    return nextSession;
  } catch (err) {
    console.warn('[CartApi] Failed to rotate guest session storage:', err);
    return `guest_fallback_${Date.now()}`;
  }
}

/**
 * Clears the persisted guest session identifier (e.g. on logout).
 */
export async function clearGuestSessionId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_SESSION_KEY);
  } catch (err) {
    console.warn('[CartApi] Failed to clear guest session storage:', err);
  }
}

function buildHeaders(sessionId?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }
  return headers;
}

export async function getCartApi(sessionId?: string | null): Promise<CartResponse> {
  return handleApiResponse(
    apiClient.get<IApiResponse<CartResponse>>('/cart', {
      headers: buildHeaders(sessionId),
    }),
  );
}

export async function addToCartApi(
  input: AddToCartInput,
  sessionId?: string | null,
): Promise<CartResponse> {
  return handleApiResponse(
    apiClient.post<IApiResponse<CartResponse>>('/cart/items', input, {
      headers: buildHeaders(sessionId),
    }),
  );
}

export async function updateCartItemApi(
  itemId: string,
  input: UpdateCartItemInput,
  sessionId?: string | null,
): Promise<CartResponse> {
  return handleApiResponse(
    apiClient.patch<IApiResponse<CartResponse>>(`/cart/items/${itemId}`, input, {
      headers: buildHeaders(sessionId),
    }),
  );
}

export async function removeCartItemApi(
  itemId: string,
  sessionId?: string | null,
): Promise<CartResponse> {
  return handleApiResponse(
    apiClient.delete<IApiResponse<CartResponse>>(`/cart/items/${itemId}`, {
      headers: buildHeaders(sessionId),
    }),
  );
}

export async function clearCartApi(sessionId?: string | null): Promise<CartResponse> {
  return handleApiResponse(
    apiClient.delete<IApiResponse<CartResponse>>('/cart', {
      headers: buildHeaders(sessionId),
    }),
  );
}

export async function syncCartApi(input: SyncCartInput): Promise<CartResponse> {
  return handleApiResponse(apiClient.post<IApiResponse<CartResponse>>('/cart/sync', input));
}
