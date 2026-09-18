import type { NotificationTab } from '../components/notification-filter-tabs';
import type { NotificationItemMobile } from '../types';

export function filterNotificationsByTab(
  items: NotificationItemMobile[] = [],
  tab: NotificationTab,
): NotificationItemMobile[] {
  if (tab === 'ORDERS') {
    return items.filter(
      (n) => n.type === 'ORDER_STATUS' || n.type === 'PAYMENT' || n.type === 'VENDOR_ORDER',
    );
  }
  if (tab === 'OFFERS') {
    return items.filter(
      (n) => n.type === 'BROADCAST' || n.type === 'PRICE_DROP' || n.type === 'CART_ABANDONED',
    );
  }
  return items;
}
