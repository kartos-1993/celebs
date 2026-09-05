import type { OrderItemStatus, StatusTab } from '../types';

export const PAGE_LIMIT = 10;

export const VENDOR_STATUS_TABS: StatusTab[] = [
  { id: 'ALL', label: 'All Items' },
  { id: 'PENDING', label: 'Needs Packing' },
  { id: 'PACKED', label: 'Ready for Courier' },
  { id: 'HANDED_OVER', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const ADMIN_ORDER_STATUS_TABS: StatusTab[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'PACKED', label: 'Packed' },
  { id: 'HANDED_OVER', label: 'Handed Over' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: 'Needs Packing',
  PACKED: 'Packed & Ready',
  HANDED_OVER: 'In Transit',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const ITEM_STATUS_HINTS: Record<OrderItemStatus, string> = {
  PENDING: '',
  PACKED: ' (Item boxed & sealed)',
  HANDED_OVER: ' (Scanned by Courier)',
  DELIVERED: ' (Received by Customer)',
  CANCELLED: ' (Out of stock / Cancelled)',
};

/** Allowed next stages per current stage — backend remains authoritative. */
export const ALLOWED_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ['PACKED', 'CANCELLED'],
  PACKED: ['HANDED_OVER', 'CANCELLED'],
  HANDED_OVER: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const DEFAULT_COURIER = 'Nepal Can Move';

export const COURIER_OPTIONS = ['Upaya Logistics', 'Nepal Can Move', 'PATHAO', 'MANUAL'] as const;
