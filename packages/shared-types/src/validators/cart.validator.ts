import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  colorVariantName: z.string().min(1, 'Color variant name is required'),
  size: z.string().min(1, 'Size is required'),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

export const syncCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      colorVariantName: z.string().min(1),
      size: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type SyncCartInput = z.infer<typeof syncCartSchema>;
