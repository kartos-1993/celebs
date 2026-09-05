import type {
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UpdateOrderItemStatusInput,
} from '@celebs/shared-types';

export type LogisticsProvider = 'NEPAL_CAN_MOVE' | 'PATHAO' | 'MANUAL';

export interface OrderAddressDto {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  cityArea: string;
  streetAddress: string;
}

export interface OrderUserDto {
  id: string;
  name: string;
  email: string;
}

export interface OrderCoreDto {
  id: string;
  orderNumber: string;
  status: OrderStatus | string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: string | number;
  createdAt: string;
  address: OrderAddressDto | null;
  user: OrderUserDto | null;
}

/** Base DTO for an order item returned by backend */
export interface OrderItemDto {
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
}

/** Vendor perspective: item with embedded parent order */
export interface VendorOrderItemDto extends OrderItemDto {
  order: OrderCoreDto;
}

/** Admin perspective: parent order with embedded items */
export interface AdminOrderDto extends OrderCoreDto {
  items: OrderItemDto[];
}

/** Customer/order metadata flattened into fulfillment table rows */
export interface OrderCustomerInfo {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  cityArea: string;
  provinceDistrict: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

/** Fully flattened UI row for order tables and card lists */
export interface OrderItemUI extends OrderCustomerInfo {
  id: string;
  productName: string;
  colorVariantName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  itemStatus: OrderItemStatus;
  trackingNumber?: string;
  courierPartner?: string;
  createdAt: string;
}

/** Backward compatibility aliases */
export type OrderCoreUI = OrderCustomerInfo;
export type OrderItemRowFields = OrderItemDto;
export type {
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UpdateOrderItemStatusInput,
};

export type Mode = 'vendor' | 'admin';

export interface StatusTab {
  id: string;
  label: string;
}

export type OrdersListState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'success'; rows: OrderItemUI[] };
