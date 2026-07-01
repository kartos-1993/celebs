import { z } from 'zod';
import { createProductSchema, updateProductSchema, updateProductStockSchema } from './product.validator';

// Validation function for creating a product
export const validateCreateProduct = (data: unknown) => {
  return createProductSchema.safeParse(data);
};

// Validation function for updating a product
export const validateUpdateProduct = (data: unknown) => {
  return updateProductSchema.safeParse(data);
};

// Validation function for updating product stock
export const validateUpdateStock = (data: unknown) => {
  return updateProductStockSchema.safeParse(data);
};
