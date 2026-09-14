import type {
  AdminOrderDto,
  OrderCoreDto,
  OrderCustomerInfo,
  OrderItemDto,
  OrderItemUI,
  VendorOrderItemDto,
} from '../types';

export const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);

export function mapCore(order: OrderCoreDto): OrderCustomerInfo {
  const address = order.address;
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.user?.name || address?.fullName || 'Unknown Customer',
    customerPhone: address?.phone || '',
    cityArea: address?.cityArea || '',
    provinceDistrict: address ? `${address.province} / ${address.district}` : '',
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
  };
}

export function mapItemFields(item: OrderItemDto, order: OrderCoreDto): OrderItemUI {
  return {
    ...mapCore(order),
    id: item.id,
    productName: item.productName,
    colorVariantName: item.colorVariantName,
    size: item.size,
    quantity: item.quantity,
    unitPrice: toNumber(item.unitPrice),
    totalAmount: toNumber(item.subtotal),
    itemStatus: item.itemStatus,
    trackingNumber: item.trackingNumber ?? undefined,
    courierPartner: item.courierPartner ?? undefined,
    createdAt: item.createdAt,
  };
}

export function mapVendorItemsToRows(items: VendorOrderItemDto[]): OrderItemUI[] {
  return items.map((item) => mapItemFields(item, item.order));
}

export function mapAdminOrdersToRows(orders: AdminOrderDto[]): OrderItemUI[] {
  return orders.flatMap((order) => order.items.map((item) => mapItemFields(item, order)));
}
