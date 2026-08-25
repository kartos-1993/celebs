export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PACKED'
  | 'HANDED_OVER'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderItemStatus = 'PENDING' | 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED';

export interface OrderItemView {
  id: string;
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  itemStatus: OrderItemStatus;
  trackingNumber?: string | null;
  courierPartner?: string | null;
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
  PENDING_PAYMENT: { label: 'Pending Payment', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'active' },
  PACKED: { label: 'Packed', tone: 'active' },
  HANDED_OVER: { label: 'In Transit', tone: 'active' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', tone: 'active' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  RETURNED: { label: 'Returned', tone: 'danger' },
};

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
