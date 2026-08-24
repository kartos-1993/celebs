import { z } from 'zod';

export const createComboSchema = z.object({
  title: z.string().min(2, 'Combo title is required'),
  slug: z.string().min(2, 'Slug is required'),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  bannerImage: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number().positive('Discount value must be positive'),
  isFirstParty: z.boolean().default(true),
  tag: z.string().optional(),
  productIds: z.array(z.string()).min(1, 'At least 1 product is required'),
});

export type CreateComboType = z.infer<typeof createComboSchema>;

/** Partial payload for combo updates — strips unknown keys at the boundary. */
export const updateComboSchema = createComboSchema.partial();
export type UpdateComboType = z.infer<typeof updateComboSchema>;
