import { z } from 'zod';

// Common schema for ID validation
export const idSchema = z.string().trim().min(1).max(50);

// Attribute schema
export const attributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required').max(50),
  values: z.array(z.string()),
});

// Base schema for shared fields between categories and subcategories
const baseSchema = {
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100),
};

// Category schemas
export const createCategorySchema = z.object({
  ...baseSchema,
});

export const updateCategorySchema = z.object({
  ...baseSchema,
});

export const getCategoryByIdSchema = z.object({
  id: idSchema,
});

// Subcategory schemas
export const createSubcategorySchema = z.object({
  ...baseSchema,
  attributes: z.array(attributeSchema).optional(),
});

export const updateSubcategorySchema = z.object({
  ...baseSchema,
  attributes: z.array(attributeSchema).optional(),
});

export const getSubcategoryByIdSchema = z.object({
  id: idSchema,
});
