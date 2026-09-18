import { z } from 'zod';

export const reviewStatusEnum = z.enum(['APPROVED', 'REJECTED', 'PENDING_MODERATION']);
export const reviewFitRatingEnum = z.enum(['RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE']);

export const createReviewSchema = z.object({
  orderItemId: z.string().uuid('Invalid order item ID'),
  rating: z.coerce.number().int().min(1).max(5),
  fitRating: reviewFitRatingEnum.optional(),
  comment: z
    .string()
    .trim()
    .min(1, 'Review comment cannot be empty')
    .max(1000, 'Review comment cannot exceed 1000 characters'),
  images: z.array(z.string().url()).max(5).optional(),
});

export const updateReviewStatusSchema = z.object({
  status: reviewStatusEnum,
});

export const presignReviewImageSchema = z.object({
  originalname: z.string().trim().min(1, 'Original name is required'),
  mimeType: z
    .string()
    .regex(/^image\/(jpeg|png|webp|gif)$/, 'Only JPEG, PNG, WEBP, and GIF images are supported'),
  size: z.coerce
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),
});

export const adminReviewsQuerySchema = z.object({
  vendorId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  status: reviewStatusEnum.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hasImages: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  search: z.string().trim().max(100).optional(),
});

export const productReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  hasImages: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export const reviewIdParamSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
});

export const productIdParamSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type PresignReviewImageInput = z.infer<typeof presignReviewImageSchema>;
export type AdminReviewsQuery = z.infer<typeof adminReviewsQuerySchema>;
export type ProductReviewsQuery = z.infer<typeof productReviewsQuerySchema>;
export type ReviewIdParam = z.infer<typeof reviewIdParamSchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
