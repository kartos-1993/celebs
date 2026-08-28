import type { RawOrder } from '../types';

import type {
  OrderItemStatus,
  OrderItemView,
  OrderStatus,
  OrderTrackingEventView,
  OrderView,
} from './order-status';

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function mapItem(raw: Record<string, unknown>): OrderItemView {
  return {
    id: String(raw.id),
    productName: String(raw.productName ?? 'Item'),
    colorVariantName: String(raw.colorVariantName ?? ''),
    size: String(raw.size ?? ''),
    quantity: toNumber(raw.quantity),
    unitPrice: toNumber(raw.unitPrice),
    subtotal: toNumber(raw.subtotal),
    itemStatus: (raw.itemStatus as OrderItemStatus) ?? 'PENDING',
    ...(raw.trackingNumber ? { trackingNumber: String(raw.trackingNumber) } : {}),
    ...(raw.courierPartner ? { courierPartner: String(raw.courierPartner) } : {}),
  };
}

export function mapEvent(raw: Record<string, unknown>): OrderTrackingEventView {
  return {
    id: String(raw.id),
    status: (raw.status as OrderStatus) ?? 'CONFIRMED',
    title: String(raw.title ?? ''),
    description: raw.description ? String(raw.description) : null,
    location: raw.location ? String(raw.location) : null,
    source: String(raw.source ?? 'SYSTEM'),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
  };
}

export function mapOrder(raw: RawOrder): OrderView {
  const payments = (raw.payments ?? []).map((p) => ({
    id: String(p.id),
    amount: toNumber(p.amount),
    currency: String(p.currency ?? 'NPR'),
    gateway: String(p.gateway ?? raw.paymentMethod),
    status: String(p.status ?? 'PENDING'),
  }));

  return {
    id: raw.id,
    orderNumber: raw.orderNumber,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: raw.status,
    paymentMethod: raw.paymentMethod,
    paymentStatus: raw.paymentStatus,
    subtotal: toNumber(raw.subtotal),
    shippingFee: toNumber(raw.shippingFee),
    discountAmount: toNumber(raw.discountAmount),
    totalAmount: toNumber(raw.totalAmount),
    ...(raw.courierProvider ? { courierProvider: raw.courierProvider } : {}),
    ...(raw.courierName ? { courierName: raw.courierName } : {}),
    ...(raw.trackingNumber ? { trackingNumber: raw.trackingNumber } : {}),
    ...(raw.trackingUrl ? { trackingUrl: raw.trackingUrl } : {}),
    ...(raw.estimatedDelivery ? { estimatedDelivery: raw.estimatedDelivery } : {}),
    items: (raw.items ?? []).map(mapItem),
    address: raw.address
      ? {
          fullName: String(raw.address.fullName ?? ''),
          phone: String(raw.address.phone ?? ''),
          province: String(raw.address.province ?? ''),
          district: String(raw.address.district ?? ''),
          cityArea: String(raw.address.cityArea ?? ''),
          streetAddress: String(raw.address.streetAddress ?? ''),
          landmark: raw.address.landmark ? String(raw.address.landmark) : null,
        }
      : null,
    ...(payments.length > 0 ? { payments } : {}),
    ...(raw.trackingEvents ? { trackingEvents: raw.trackingEvents.map(mapEvent) } : {}),
  };
}
