import { apiClient } from '../../../api/client';
import {
  AddToCartInput,
  CartResponse,
  SyncCartInput,
  UpdateCartItemInput,
} from '@celebs/shared-types';

export class CartApiService {
  static async getCart(sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.get<{ message: string; data: CartResponse }>('/cart', {
      headers,
    });
    return response.data.data;
  }

  static async addToCart(input: AddToCartInput, sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    console.log('[Mobile CartApiService] addToCart payload:', input, 'sessionId:', sessionId);
    try {
      const response = await apiClient.post<{ message: string; data: CartResponse }>('/cart/items', input, {
        headers,
      });
      console.log('[Mobile CartApiService] addToCart success response:', response.data);
      return response.data.data;
    } catch (error: unknown) {
      console.error('[Mobile CartApiService] addToCart API error:', JSON.stringify(error, null, 2));
      throw error;
    }
  }


  static async updateCartItem(
    itemId: string,
    input: UpdateCartItemInput,
    sessionId?: string
  ): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.patch<{ message: string; data: CartResponse }>(
      `/cart/items/${itemId}`,
      input,
      { headers }
    );
    return response.data.data;
  }

  static async removeCartItem(itemId: string, sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.delete<{ message: string; data: CartResponse }>(
      `/cart/items/${itemId}`,
      { headers }
    );
    return response.data.data;
  }

  static async clearCart(sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.delete<{ message: string; data: CartResponse }>('/cart', {
      headers,
    });
    return response.data.data;
  }

  static async syncCart(input: SyncCartInput): Promise<CartResponse> {
    const response = await apiClient.post<{ message: string; data: CartResponse }>('/cart/sync', input);
    return response.data.data;
  }
}
