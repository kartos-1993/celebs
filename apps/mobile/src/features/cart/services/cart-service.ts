import {
  AddToCartInput,
  CartResponse,
  SyncCartInput,
  UpdateCartItemInput,
} from '@celebs/shared-types';

import { apiClient } from '../../../api/client';

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
    const response = await apiClient.post<{ message: string; data: CartResponse }>(
      '/cart/items',
      input,
      {
        headers,
      },
    );
    return response.data.data;
  }

  static async updateCartItem(
    itemId: string,
    input: UpdateCartItemInput,
    sessionId?: string,
  ): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.patch<{ message: string; data: CartResponse }>(
      `/cart/items/${itemId}`,
      input,
      { headers },
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
      { headers },
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
    const response = await apiClient.post<{ message: string; data: CartResponse }>(
      '/cart/sync',
      input,
    );
    return response.data.data;
  }
}
