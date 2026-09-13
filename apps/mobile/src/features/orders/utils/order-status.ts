import type { OrderItemStatus, OrderStatus } from '@celebs/shared-types';

export type { OrderItemStatus, OrderStatus };

export interface OrderItemView {
  id: string;
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemStatus: OrderItemStatus;
  imageUrl?: string | null;
  trackingNumber?: string | null;
  courierPartner?: string | null;
  vendorName?: string | null;
}

export interface OrderAddressView {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  cityArea: string;
  streetAddress: string;
  landmark?: string | null;
}

export interface OrderTrackingEventView {
  id: string;
  status: OrderStatus;
  title: string;
  description?: string | null;
  location?: string | null;
  source: string;
  timestamp: string;
}

export interface OrderPaymentView {
  id: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
}

export interface OrderView {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  courierProvider?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  items: OrderItemView[];
  address: OrderAddressView | null;
  payments?: OrderPaymentView[];
  trackingEvents?: OrderTrackingEventView[];
}

export interface StatusMeta {
  label: string;
  tone: 'active' | 'success' | 'warning' | 'danger' | 'neutral';
}

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  PENDING_PAYMENT: { label: 'To Pay', tone: 'warning' },
  CONFIRMED: { label: 'To Ship', tone: 'active' },
  PACKED: { label: 'Packed', tone: 'active' },
  HANDED_OVER: { label: 'In Transit', tone: 'active' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', tone: 'active' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  RETURNED: { label: 'Returned', tone: 'danger' },
};

export type OrderFilterTab =
  | 'ALL'
  | 'TO_PAY'
  | 'TO_SHIP'
  | 'TO_RECEIVE'
  | 'TO_REVIEW'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderFilterTabOption {
  key: OrderFilterTab;
  label: string;
}

export const ORDER_FILTER_TABS: OrderFilterTabOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'TO_PAY', label: 'To Pay' },
  { key: 'TO_SHIP', label: 'To Ship' },
  { key: 'TO_RECEIVE', label: 'To Receive' },
  { key: 'TO_REVIEW', label: 'To Review' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export function matchesOrderFilter(order: OrderView, filter: OrderFilterTab): boolean {
  if (filter === 'ALL') return true;

  if (filter === 'TO_PAY') {
    return (
      (order.paymentStatus === 'PENDING' || order.status === 'PENDING_PAYMENT') &&
      order.paymentMethod !== 'COD' &&
      order.status !== 'CANCELLED' &&
      order.status !== 'RETURNED'
    );
  }

  if (filter === 'TO_SHIP') {
    if (
      order.status === 'CANCELLED' ||
      order.status === 'RETURNED' ||
      order.status === 'DELIVERED'
    ) {
      return false;
    }
    const isUnpaidOnline =
      order.paymentMethod !== 'COD' &&
      (order.paymentStatus === 'PENDING' || order.status === 'PENDING_PAYMENT');
    if (isUnpaidOnline) return false;

    const hasItemsWaitingToShip = order.items.some(
      (item) => item.itemStatus === 'PENDING' || item.itemStatus === 'PACKED',
    );
    const isOrderPreparing = order.status === 'CONFIRMED' || order.status === 'PACKED';

    return hasItemsWaitingToShip || isOrderPreparing;
  }

  if (filter === 'TO_RECEIVE') {
    if (
      order.status === 'CANCELLED' ||
      order.status === 'RETURNED' ||
      order.status === 'DELIVERED'
    ) {
      return false;
    }
    const isOrderInTransit = order.status === 'HANDED_OVER' || order.status === 'OUT_FOR_DELIVERY';
    const hasItemsInTransit = order.items.some((item) => item.itemStatus === 'HANDED_OVER');
    return isOrderInTransit || hasItemsInTransit;
  }

  if (filter === 'DELIVERED') {
    return order.status === 'DELIVERED';
  }

  if (filter === 'CANCELLED') {
    return order.status === 'CANCELLED' || order.status === 'RETURNED';
  }

  return true;
}

export function getItemStatusMeta(status: OrderItemStatus): StatusMeta {
  switch (status) {
    case 'PENDING':
      return { label: 'Processing', tone: 'neutral' };
    case 'PACKED':
      return { label: 'Packed', tone: 'active' };
    case 'HANDED_OVER':
      return { label: 'In Transit', tone: 'active' };
    case 'DELIVERED':
      return { label: 'Delivered', tone: 'success' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'danger' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

export function getOrderStatusMeta(status: OrderStatus): StatusMeta {
  return STATUS_META[status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' };
}

/** Orders in these statuses receive live polling on the detail screen */
export function isActiveOrder(status: OrderStatus): boolean {
  return (
    status === 'CONFIRMED' ||
    status === 'PACKED' ||
    status === 'HANDED_OVER' ||
    status === 'OUT_FOR_DELIVERY'
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatDate(iso)} · ${hour12}:${minutes} ${meridiem}`;
}
