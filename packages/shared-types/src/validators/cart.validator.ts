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
  sessionId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        colorVariantName: z.string().min(1),
        size: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .optional()
    .default([]),
});

export const addComboToCartSchema = z.object({
  comboBundleId: z.string().min(1, 'Combo bundle ID is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        colorVariantName: z.string().min(1, 'Color variant name is required'),
        size: z.string().min(1, 'Size is required'),
        // Optional by design: an omitted quantity resolves to the bundle
        // item's own defaultQuantity in CartService.
        quantity: z.number().int().positive('Quantity must be at least 1').optional(),
      }),
    )
    .min(1, 'A combo bundle must contain at least one item'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type SyncCartInput = z.infer<typeof syncCartSchema>;
export type AddComboToCartInput = z.infer<typeof addComboToCartSchema>;
