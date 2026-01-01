import { z } from 'zod';
import { createReviewSchema, updateReviewSchema } from './review.validator';

// Validation function for creating a review
export const validateCreateReview = (data: unknown) => {
  return createReviewSchema.safeParse(data);
};

// Validation function for updating a review
export const validateUpdateReview = (data: unknown) => {
  return updateReviewSchema.safeParse(data);
};
