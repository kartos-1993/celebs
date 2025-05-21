import { z } from 'zod';

// Common schema for ID validation
export const idSchema = z.string().trim().min(1).max(50);

// Base category schema for shared fields
const baseCategorySchema = {
  name: z.string().trim().min(2, 'Category name must be at least 2 characters long').max(100),
};

// Schema for creating a new category
export const createCategorySchema = z.object({
  ...baseCategorySchema,
});

// Schema for updating an existing category
export const updateCategorySchema = z.object({
  ...baseCategorySchema,
});

// Schema for getting a single category by ID
export const getCategoryByIdSchema = z.object({
  id: idSchema,
});

// Subcategory schemas
const attributeSchema = z.object({
  name: z.string().trim().min(1, 'Attribute name is required').max(50),
  values: z.array(z.string()).optional(),
});

const baseSubcategorySchema = {
  name: z.string().trim().min(2, 'Subcategory name must be at least 2 characters long').max(100),
  categoryId: idSchema,
  attributes: z.array(attributeSchema).optional(),
};

// Schema for creating a new subcategory
export const createSubcategorySchema = z.object({
  ...baseSubcategorySchema,
});

// Schema for updating an existing subcategory
export const updateSubcategorySchema = z.object({
  ...baseSubcategorySchema,
});

// Schema for getting a single subcategory by ID
export const getSubcategoryByIdSchema = z.object({
  id: idSchema,
});