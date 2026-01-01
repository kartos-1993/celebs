import { z } from 'zod';
import { idSchema } from './category.validator';

// Product measurement schema
const productMeasurementSchema = z.object({
  name: z.string().trim().min(1, 'Measurement name is required'),
  value: z.string().trim().min(1, 'Measurement value is required'),
  unit: z.string().trim().min(1, 'Measurement unit is required'),
});

// Body measurement schema
const bodyMeasurementSchema = z.object({
  name: z.string().trim().min(1, 'Measurement name is required'),
  value: z.string().trim().min(1, 'Measurement value is required'),
  unit: z.string().trim().min(1, 'Measurement unit is required'),
});

// Size schema
const sizeSchema = z.object({
  name: z.string().trim().min(1, 'Size name is required'),
  productMeasurements: z.array(productMeasurementSchema).optional().default([]),
  bodyMeasurements: z.array(bodyMeasurementSchema).optional().default([]),
});

// Stock schema
const stockSchema = z.object({
  size: z.string().trim().min(1, 'Size is required'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

// Color variant schema
const colorVariantSchema = z.object({
  name: z.string().trim().min(1, 'Color name is required'),
  colorCode: z.string().trim().min(1, 'Color code is required'),
  images: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
  stocks: z.array(stockSchema).optional().default([]),
});

// Base product schema
const baseProductSchema = {
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().trim().min(10, 'Product description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  discountedPrice: z.number().positive('Discounted price must be positive').optional(),
  categoryId: idSchema,
  subcategoryId: idSchema,
  sizes: z.array(sizeSchema).optional().default([]),
  colorVariants: z.array(colorVariantSchema).min(1, 'At least one color variant is required'),
  tags: z.array(z.string()).optional().default([]),
  featured: z.boolean().optional().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
};

// Schema for creating a new product
export const createProductSchema = z.object({
  ...baseProductSchema,
}).refine(
  (data) => {
    if (data.discountedPrice && data.discountedPrice >= data.price) {
      return false;
    }
    return true;
  },
  {
    message: 'Discounted price must be less than the regular price',
    path: ['discountedPrice'],
  }
);

// Schema for updating an existing product
export const updateProductSchema = z.object({
  ...baseProductSchema,
}).partial().refine(
  (data) => {
    if (data.discountedPrice && data.price && data.discountedPrice >= data.price) {
      return false;
    }
    return true;
  },
  {
    message: 'Discounted price must be less than the regular price',
    path: ['discountedPrice'],
  }
);

// Schema for getting a single product by ID
export const getProductByIdSchema = z.object({
  id: idSchema,
});

// Schema for updating product stock
export const updateProductStockSchema = z.object({
  productId: idSchema,
  colorVariantName: z.string().trim().min(1, 'Color variant name is required'),
  stocks: z.array(stockSchema),
});

// Schema for product search and filtering
export const productFilterSchema = z.object({
  search: z.string().optional(),
  categoryId: idSchema.optional(),
  subcategoryId: idSchema.optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.boolean().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(10),
  sortBy: z.enum(['createdAt', 'price', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});