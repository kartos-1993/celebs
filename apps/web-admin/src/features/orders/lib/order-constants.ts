import type { OrderItemStatus, StatusTab } from '../types';

export const PAGE_LIMIT = 10;

export const VENDOR_STATUS_TABS: StatusTab[] = [
  { id: 'ALL', label: 'All Items' },
  { id: 'PENDING', label: 'Needs Packing' },
  { id: 'PACKED', label: 'Ready for Hub Handover' },
  { id: 'HANDED_OVER', label: 'In Transit' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const ADMIN_ORDER_STATUS_TABS: StatusTab[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'PACKED', label: 'Packed / Awaiting Hub Intake' },
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
  PACKED: ' (Awaiting Hub Intake & Dispatch)',
  HANDED_OVER: ' (Scanned by Courier)',
  DELIVERED: ' (Received by Customer)',
  CANCELLED: ' (Out of stock / Cancelled)',
};

/** Allowed next stages per current stage for Platform Operators (Superadmin/Staff). */
export const ALLOWED_PLATFORM_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ['PACKED', 'CANCELLED'],
  PACKED: ['HANDED_OVER', 'CANCELLED'],
  HANDED_OVER: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Allowed next stages per current stage for Third-Party Vendors.
 * In a centralized marketplace (central hub operations), vendors are strictly restricted to
 * packing items ('PACKED') or cancelling ('CANCELLED') if out of stock.
 * 3PL dispatch ('HANDED_OVER') and customer delivery ('DELIVERED') are strictly
 * managed by Celebs platform logistics.
 */
export const ALLOWED_VENDOR_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ['PACKED', 'CANCELLED'],
  PACKED: ['CANCELLED'],
  HANDED_OVER: [],
  DELIVERED: [],
  CANCELLED: [],
};

/** Default platform transitions alias for backwards compatibility. */
export const ALLOWED_TRANSITIONS = ALLOWED_PLATFORM_TRANSITIONS;

export function getAllowedTransitions(
  currentStatus: OrderItemStatus,
  isPlatform: boolean,
): OrderItemStatus[] {
  return isPlatform
    ? (ALLOWED_PLATFORM_TRANSITIONS[currentStatus] ?? [])
    : (ALLOWED_VENDOR_TRANSITIONS[currentStatus] ?? []);
}

export const DEFAULT_COURIER = 'PATHAO';

export const COURIER_OPTIONS = ['PATHAO', 'MANUAL'] as const;

export function getOrderActionProps(
  itemStatus: OrderItemStatus,
  isVendor: boolean,
): { label: string; variant: 'default' | 'outline' } {
  if (isVendor) {
    return {
      label: itemStatus === 'PENDING' ? 'Pack Order' : 'View Details',
      variant: itemStatus === 'PENDING' ? 'default' : 'outline',
    };
  }
  if (itemStatus === 'PACKED') {
    return { label: 'Receive & Dispatch', variant: 'default' };
  }
  return { label: 'View Details', variant: 'outline' };
}
