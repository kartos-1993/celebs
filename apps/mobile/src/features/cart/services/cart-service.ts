import {
  AddToCartInput,
  CartResponse,
  IApiResponse,
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
    const response = await apiClient.get<IApiResponse<CartResponse>>('/cart', {
      headers,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch cart');
    }
    return response.data.data;
  }

  static async addToCart(input: AddToCartInput, sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.post<IApiResponse<CartResponse>>('/cart/items', input, {
      headers,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to add item to cart');
    }
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
    const response = await apiClient.patch<IApiResponse<CartResponse>>(
      `/cart/items/${itemId}`,
      input,
      { headers },
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update cart item');
    }
    return response.data.data;
  }

  static async removeCartItem(itemId: string, sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.delete<IApiResponse<CartResponse>>(`/cart/items/${itemId}`, {
      headers,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to remove cart item');
    }
    return response.data.data;
  }

  static async clearCart(sessionId?: string): Promise<CartResponse> {
    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['x-session-id'] = sessionId;
    }
    const response = await apiClient.delete<IApiResponse<CartResponse>>('/cart', {
      headers,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to clear cart');
    }
    return response.data.data;
  }

  static async syncCart(input: SyncCartInput): Promise<CartResponse> {
    const response = await apiClient.post<IApiResponse<CartResponse>>('/cart/sync', input);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to sync cart');
    }
    return response.data.data;
  }
}
