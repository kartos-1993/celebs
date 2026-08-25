import { z } from 'zod';

export const addToWishlistSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
});

export type AddToWishlistInput = z.infer<typeof addToWishlistSchema>;
