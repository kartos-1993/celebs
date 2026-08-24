import { z } from 'zod';

export const createCampaignSchema = z.object({
  title: z.string().min(2, 'Campaign title is required'),
  slug: z.string().min(2, 'Slug is required'),
  campaignType: z
    .enum(['FESTIVAL', 'SEASONAL', 'FLASH_SALE', 'HOLIDAY', 'NEW_YEAR'])
    .default('FESTIVAL'),
  tagline: z.string().optional(),
  bannerImage: z.string().optional(),
  themeColor: z.string().default('#D92525'),
  startDate: z.string().datetime({ message: 'Invalid UTC ISO start date' }),
  endDate: z.string().datetime({ message: 'Invalid UTC ISO end date' }),
  productIds: z.array(z.string()).optional(),
});

export type CreateCampaignType = z.infer<typeof createCampaignSchema>;

/**
 * Partial payload for campaign updates — strips unknown keys at the boundary.
 * Extends with productIds (the shape the admin form actually PUTs).
 */
export const updateCampaignSchema = createCampaignSchema
  .extend({ productIds: z.array(z.string()).optional() })
  .partial();
export type UpdateCampaignType = z.infer<typeof updateCampaignSchema>;
