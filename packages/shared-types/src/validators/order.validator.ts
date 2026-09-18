import { z } from 'zod';

export const addressSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(7, 'Valid phone number is required'),
  altPhone: z.string().optional(),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  cityArea: z.string().min(1, 'City/Area (e.g. New Baneshwor, Jhamsikhel) is required'),
  streetAddress: z.string().min(3, 'Street address is required'),
  landmark: z.string().optional(),
  label: z.string().default('Home'),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = addressSchema.partial();

export const COD_MAX_LIMIT = 5000;

export const PAYMENT_METHODS = ['COD', 'KHALTI', 'ESEWA'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PACKED',
  'HANDED_OVER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = [
  'PENDING',
  'PACKED',
  'HANDED_OVER',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const checkoutSchema = z.object({
  addressId: z.string().uuid('Valid shipping address ID is required').optional(),
  shippingAddress: addressSchema.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  idempotencyKey: z.string().min(8, 'Idempotency key is required'),
  notes: z.string().optional(),
  /**
   * Origin (scheme + host + optional port, no path) the customer's browser can
   * reach the API at — e.g. the phone's LAN URL for the dev machine. Used to
   * build wallet redirect targets per order. Server allowlists it; anything
   * untrusted falls back to the static env URLs.
   */
  callbackBase: z.string().url('callbackBase must be a valid URL').max(120).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const updateOrderItemStatusSchema = z.object({
  itemStatus: z.enum(ORDER_ITEM_STATUSES),
  trackingNumber: z.string().optional(),
  courierPartner: z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED', 'REFUNDED']),
  reference: z.string().min(2, 'Payment reference is required for audit'),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

export const addressIdParamSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
});

export const orderItemIdParamSchema = z.object({
  orderItemId: z.string().uuid('Invalid order item ID'),
});

export const orderPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(ORDER_STATUSES).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type AddressIdParam = z.infer<typeof addressIdParamSchema>;
export type OrderItemIdParam = z.infer<typeof orderItemIdParamSchema>;
export type OrderPaginationQuery = z.infer<typeof orderPaginationQuerySchema>;
