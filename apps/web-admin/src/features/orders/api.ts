import { UpdateOrderItemStatusInput } from '@celebs/shared-types';

import { axiosClient } from '@/lib/axios/axios-client';

export const ORDERS_QUERY_KEYS = {
  all: ['orders'] as const,
  vendor: (filters: { status?: string; page: number; limit: number }) =>
    [...ORDERS_QUERY_KEYS.all, 'vendor', filters] as const,
  admin: (filters: { status?: string; page: number; limit: number }) =>
    [...ORDERS_QUERY_KEYS.all, 'admin', filters] as const,
};

export type OrderItemStatus = 'PENDING' | 'PACKED' | 'HANDED_OVER' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'STRIPE' | 'KHALTI' | 'ESEWA';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

interface OrderAddressDto {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  cityArea: string;
  streetAddress: string;
}

interface OrderUserDto {
  id: string;
  name: string;
  email: string;
}

interface OrderCoreDto {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: string | number;
  createdAt: string;
  address: OrderAddressDto | null;
  user: OrderUserDto | null;
}

/** Raw OrderItem as returned by GET /orders/vendor/orders (Prisma Decimal → string). */
export interface VendorOrderItemDto {
  id: string;
  orderId: string;
  productName: string;
  colorVariantName: string;
  size: string;
  unitPrice: string | number;
  quantity: number;
  subtotal: string | number;
  itemStatus: OrderItemStatus;
  trackingNumber: string | null;
  courierPartner: string | null;
  createdAt: string;
  order: OrderCoreDto;
}

/** Raw Order incl. items as returned by GET /orders/admin/orders. */
export interface AdminOrderDto extends OrderCoreDto {
  items: Array<Omit<VendorOrderItemDto, 'order'>>;
}

export interface OrdersListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export type VendorOrdersResponse = {
  success: boolean;
  data: { items: VendorOrderItemDto[]; total: number; page: number; limit: number };
};

export type AdminOrdersResponse = {
  success: boolean;
  data: { orders: AdminOrderDto[]; total: number; page: number; limit: number };
};

export async function getVendorOrders({ status, page = 1, limit = 10 }: OrdersListParams): Promise<VendorOrdersResponse> {
  const response = await axiosClient.get('/orders/vendor/orders', {
    params: { ...(status ? { status } : {}), page, limit },
  });
  return response.data as VendorOrdersResponse;
}

export async function getAdminOrders({ status, page = 1, limit = 10 }: OrdersListParams): Promise<AdminOrdersResponse> {
  const response = await axiosClient.get('/orders/admin/orders', {
    params: { ...(status ? { status } : {}), page, limit },
  });
  return response.data as AdminOrdersResponse;
}

export async function updateOrderItemStatusApi(
  orderItemId: string,
  body: UpdateOrderItemStatusInput,
) {
  const response = await axiosClient.patch(`/orders/vendor/orders/items/${orderItemId}/status`, body);
  return response.data as { success: boolean; data: VendorOrderItemDto };
}

// --- Row mapping (flatten item + order + address for the fulfillment table) ---

export interface OrderItemUI {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  cityArea: string;
  provinceDistrict: string;
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemStatus: OrderItemStatus;
  trackingNumber?: string;
  courierPartner?: string;
  createdAt: string;
}

const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);

function mapCore(order: OrderCoreDto): Pick<
  OrderItemUI,
  'orderId' | 'orderNumber' | 'customerName' | 'customerPhone' | 'cityArea' | 'provinceDistrict'
> & {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
} {
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

interface RawOrderItemFields {
  id: string;
  productName: string;
  colorVariantName: string;
  size: string;
  unitPrice: string | number;
  quantity: number;
  subtotal: string | number;
  itemStatus: OrderItemStatus;
  trackingNumber: string | null;
  courierPartner: string | null;
  createdAt: string;
}

function mapItemFields(item: RawOrderItemFields, order: OrderCoreDto): OrderItemUI {
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

// --- Logistics (existing endpoints) ---

export interface Dispatch3PLParams {
  orderId: string;
  provider?: 'NEPAL_CAN_MOVE' | 'PATHAO' | 'MANUAL';
}

export interface SettleCodParams {
  orderId: string;
  reference: string;
}

export async function dispatch3PLOrder({ orderId, provider }: Dispatch3PLParams) {
  // Backend zod schema reads `req.body.provider` — not `courierProvider`.
  const response = await axiosClient.post(`/logistics/dispatch/${orderId}`, {
    provider: provider || 'NEPAL_CAN_MOVE',
  });
  return response.data;
}

export async function settleCodOrder({ orderId, reference }: SettleCodParams) {
  const response = await axiosClient.post(`/logistics/settle-cod/${orderId}`, { reference });
  return response.data;
}
