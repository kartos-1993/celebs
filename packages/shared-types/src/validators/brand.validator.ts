import { z } from 'zod';

export const brandTierSchema = z.enum([
  'FIRST_PARTY',
  'GATED_GLOBAL',
  'REGISTERED_VENDOR',
  'OPEN_GENERIC',
]);

export const brandAuthStatusSchema = z.enum([
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'REVOKED',
]);

export const createBrandSchema = z.object({
  name: z.string().trim().min(2, 'Brand name must be at least 2 characters').max(100),
  logoUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  bannerUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  description: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
  story: z.string().trim().max(4000).optional().nullable().or(z.literal('')),
  countryOfOrigin: z.string().trim().min(2).max(100).optional().default('Nepal'),
  tier: brandTierSchema.optional().default('OPEN_GENERIC'),
  isGated: z.boolean().optional().default(false),
});

export const updateBrandSchema = createBrandSchema.partial();

export const brandFilterSchema = z.object({
  search: z.string().optional(),
  tier: brandTierSchema.optional(),
  isGated: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
});

export const createBrandAuthorizationSchema = z.object({
  brandId: z.string().uuid('Invalid Brand ID'),
  documentType: z.enum(['LOA', 'TRADEMARK_CERT', 'INVOICE', 'DEALERSHIP_CONTRACT']),
  documentUrl: z.string().url('Valid document URL is required'),
  documentExpiryDate: z.string().datetime().optional().nullable().or(z.string().length(0)),
});

export const reviewBrandAuthorizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'UNDER_REVIEW', 'REVOKED']),
  reviewNotes: z.string().trim().max(1000).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export const createBrandProtectionRuleSchema = z.object({
  brandId: z.string().uuid('Invalid Brand ID'),
  pattern: z.string().trim().min(2, 'Pattern is required'),
  matchField: z.enum(['TITLE', 'DESCRIPTION', 'TITLE_AND_DESCRIPTION']).default('TITLE_AND_DESCRIPTION'),
  isActive: z.boolean().optional().default(true),
});

export type CreateBrandType = z.infer<typeof createBrandSchema>;
export type UpdateBrandType = z.infer<typeof updateBrandSchema>;
export type BrandFilterType = z.infer<typeof brandFilterSchema>;
export type CreateBrandAuthorizationType = z.infer<typeof createBrandAuthorizationSchema>;
export type ReviewBrandAuthorizationType = z.infer<typeof reviewBrandAuthorizationSchema>;
export type CreateBrandProtectionRuleType = z.infer<typeof createBrandProtectionRuleSchema>;
