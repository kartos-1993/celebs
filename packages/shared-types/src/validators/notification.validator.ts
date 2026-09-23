import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  pushToken: z
    .string()
    .min(1, 'Push token cannot be empty')
    .refine(
      (token) => token.startsWith('ExponentPushToken[') || token.length >= 32,
      'Invalid push token format. Expected ExponentPushToken[...] or raw token',
    ),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

export const unregisterPushTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token cannot be empty'),
});

export type UnregisterPushTokenInput = z.infer<typeof unregisterPushTokenSchema>;

export const broadcastPayloadSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title exceeds 100 characters'),
  body: z.string().trim().min(1, 'Body is required').max(500, 'Body exceeds 500 characters'),
  targetAudience: z.enum(['ALL', 'CUSTOMERS', 'VENDORS']).default('ALL'),
  deepLinkUrl: z.string().trim().optional(),
});

export type BroadcastPayloadInput = z.infer<typeof broadcastPayloadSchema>;

export const notificationPointerDataSchema = z.record(z.unknown()).refine((data) => {
  const serialized = JSON.stringify(data);
  return new TextEncoder().encode(serialized).length <= 4096;
}, 'Notification payload exceeds the 4096-byte (4KB) push delivery limit');

export type NotificationPointerData = z.infer<typeof notificationPointerDataSchema>;

export const getInboxQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z
    .enum([
      'ORDER_STATUS',
      'PAYMENT',
      'BROADCAST',
      'SYSTEM',
      'VENDOR_ORDER',
      'REVIEW',
      'PRICE_DROP',
      'CART_ABANDONED',
    ])
    .optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type GetInboxQueryInput = z.infer<typeof getInboxQuerySchema>;

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

export type NotificationIdParamInput = z.infer<typeof notificationIdParamSchema>;

export const vendorIdParamSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID format'),
});

export type VendorIdParamInput = z.infer<typeof vendorIdParamSchema>;
