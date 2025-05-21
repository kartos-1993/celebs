import { z } from 'zod';
import { createCategorySchema, updateCategorySchema } from './category.validator';

// Validation function for creating a category
export const validateCreateCategory = (data: unknown) => {
  return createCategorySchema.safeParse(data);
};

// Validation function for updating a category
export const validateUpdateCategory = (data: unknown) => {
  return updateCategorySchema.safeParse(data);
};
