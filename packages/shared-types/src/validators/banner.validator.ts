import { z } from 'zod';

export const bannerLinkTypeSchema = z.enum(['PRODUCT', 'CATEGORY', 'EXTERNAL', 'NONE']);

export const bannerInputSchema = z.object({
  imageUrl: z.string().url('Banner image URL must be a valid URL'),
  linkType: bannerLinkTypeSchema.default('NONE'),
  linkValue: z.string().optional().default(''),
  title: z.string().optional().default(''),
  order: z.number().int().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateBannersSchema = z.object({
  banners: z.array(bannerInputSchema).max(3, 'Banner list can have at most 3 banners'),
});

export type BannerLinkType = z.infer<typeof bannerLinkTypeSchema>;
export type BannerInputType = z.infer<typeof bannerInputSchema>;
export type UpdateBannersType = z.infer<typeof updateBannersSchema>;
