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

export const checkoutSchema = z.object({
  addressId: z.string().uuid('Valid shipping address ID is required').optional(),
  shippingAddress: addressSchema.optional(),
  paymentMethod: z
    .enum(['COD', 'STRIPE', 'KHALTI', 'ESEWA'])
    .refine((m) => m === 'COD' || m === 'STRIPE', {
      message: 'KHALTI and ESEWA payments are not supported yet',
    }),
  idempotencyKey: z.string().min(8, 'Idempotency key is required'),
  notes: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PACKED',
    'HANDED_OVER',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
  ]),
});

export const updateOrderItemStatusSchema = z.object({
  itemStatus: z.enum(['PENDING', 'PACKED', 'HANDED_OVER', 'DELIVERED', 'CANCELLED']),
  trackingNumber: z.string().optional(),
  courierPartner: z.string().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderItemStatusInput = z.infer<typeof updateOrderItemStatusSchema>;
