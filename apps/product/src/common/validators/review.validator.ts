import { z } from 'zod';
import { idSchema } from './category.validator';

// Base review schema
const baseReviewSchema = {
  productId: idSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1, 'Review title is required').max(100),
  comment: z.string().trim().min(5, 'Review comment must be at least 5 characters'),
  images: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
};

// Schema for creating a new review
export const createReviewSchema = z.object({
  ...baseReviewSchema,
});

// Schema for updating an existing review
export const updateReviewSchema = z.object({
  ...baseReviewSchema,
}).partial();

// Schema for admin updating a review's status
export const updateReviewStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
});

// Schema for getting a single review by ID
export const getReviewByIdSchema = z.object({
  id: idSchema,
});

// Schema for getting all reviews for a product
export const getProductReviewsSchema = z.object({
  productId: idSchema,
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});