import type {
  AddToCartInput,
  CartResponse,
  SyncCartInput,
  UpdateCartItemInput,
} from '@celebs/shared-types';

import {
  addToCartApi,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  syncCartApi,
  updateCartItemApi,
} from '../api';

export class CartApiService {
  static async getCart(sessionId?: string): Promise<CartResponse> {
    return getCartApi(sessionId);
  }

  static async addToCart(input: AddToCartInput, sessionId?: string): Promise<CartResponse> {
    return addToCartApi(input, sessionId);
  }

  static async updateCartItem(
    itemId: string,
    input: UpdateCartItemInput,
    sessionId?: string,
  ): Promise<CartResponse> {
    return updateCartItemApi(itemId, input, sessionId);
  }

  static async removeCartItem(itemId: string, sessionId?: string): Promise<CartResponse> {
    return removeCartItemApi(itemId, sessionId);
  }

  static async clearCart(sessionId?: string): Promise<CartResponse> {
    return clearCartApi(sessionId);
  }

  static async syncCart(input: SyncCartInput): Promise<CartResponse> {
    return syncCartApi(input);
  }
}
