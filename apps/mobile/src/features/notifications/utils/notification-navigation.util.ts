import type { Href } from 'expo-router';

import type { NotificationItemMobile } from '../types';

/**
 * Resolves the destination route and params when a user taps a notification item.
 * Maps backend deep links (e.g. /orders/:id) to canonical Expo Router routes (/order-detail).
 */
export function resolveNotificationRoute(notification: NotificationItemMobile): Href | null {
  const data = notification.data;
  if (!data) return null;

  // 1. Direct orderId reference or /orders/:orderId URL pattern
  const rawOrderId = data.orderId;
  const rawUrl = typeof data.url === 'string' ? data.url : '';

  if (typeof rawOrderId === 'string' && rawOrderId.length > 0) {
    return {
      pathname: '/order-detail',
      params: { orderId: rawOrderId },
    } as unknown as Href;
  }

  if (rawUrl.startsWith('/orders/') && rawUrl.length > 8) {
    const extractedOrderId = rawUrl.replace('/orders/', '').split('/')[0];
    if (extractedOrderId) {
      return {
        pathname: '/order-detail',
        params: { orderId: extractedOrderId },
      } as unknown as Href;
    }
  }

  // 2. Orders list
  if (rawUrl === '/orders') {
    return '/orders' as Href;
  }

  // 3. Product reference
  const rawProductId = data.productId;
  if (typeof rawProductId === 'string' && rawProductId.length > 0) {
    return {
      pathname: '/product/[id]',
      params: { id: rawProductId },
    } as unknown as Href;
  }

  if (rawUrl.startsWith('/product/') && rawUrl.length > 9) {
    const extractedProductId = rawUrl.replace('/product/', '').split('/')[0];
    if (extractedProductId) {
      return {
        pathname: '/product/[id]',
        params: { id: extractedProductId },
      } as unknown as Href;
    }
  }

  // 4. Generic deep link starting with /
  if (rawUrl.startsWith('/')) {
    return rawUrl as Href;
  }

  return null;
}
