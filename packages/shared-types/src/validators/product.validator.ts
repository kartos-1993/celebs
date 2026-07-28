import { z } from 'zod';

// Regex-based ObjectId validator for environment compatibility (Node/Browser/Mobile)
export const idSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

// Product measurement schema
export const productMeasurementSchema = z.object({
  name: z.string().trim().min(1, 'Measurement name is required'),
  value: z.string().trim().min(1, 'Measurement value is required'),
  unit: z.string().trim().min(1, 'Measurement unit is required'),
});

// Body measurement schema
export const bodyMeasurementSchema = z.object({
  name: z.string().trim().min(1, 'Measurement name is required'),
  value: z.string().trim().min(1, 'Measurement value is required'),
  unit: z.string().trim().min(1, 'Measurement unit is required'),
});

// Size schema
export const sizeSchema = z.object({
  name: z.string().trim().min(1, 'Size name is required'),
  productMeasurements: z.array(productMeasurementSchema).optional().default([]),
  bodyMeasurements: z.array(bodyMeasurementSchema).optional().default([]),
});

// Stock schema
export const stockSchema = z.object({
  size: z.string().trim().min(1, 'Size is required'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

// Color variant schema
export const colorVariantSchema = z.object({
  name: z.string().trim().min(1, 'Color name is required'),
  colorCode: z.string().trim().min(1, 'Color code is required'),
  images: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
  stocks: z.array(stockSchema).optional().default([]),
});

export type ProductMeasurementType = z.infer<typeof productMeasurementSchema>;
export type BodyMeasurementType = z.infer<typeof bodyMeasurementSchema>;
export type ProductSizeType = z.infer<typeof sizeSchema>;
export type ProductStockType = z.infer<typeof stockSchema>;
export type ProductColorVariantType = z.infer<typeof colorVariantSchema>;


// Base product schema fields
const baseProductSchemaFields = {
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200),
  brand: z.string().trim().min(1, 'Brand is required').max(100).optional().or(z.literal('')),
  description: z.string().trim().max(4000, 'Description must be less than 4000 characters').optional().or(z.literal('')).default(''),
  price: z.number().positive('Price must be positive'),
  discountedPrice: z.number().positive('Discounted price must be positive').optional(),
  categoryId: idSchema,
  subcategoryId: idSchema,
  sizes: z.array(sizeSchema).optional().default([]),
  colorVariants: z.array(colorVariantSchema).min(1, 'At least one color variant is required'),
  mainImages: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
  dynamicData: z.record(z.unknown()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  featured: z.boolean().optional().default(false),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'deactivated', 'archived']).default('draft'),
  vendorId: z.string().optional(),
  vendorName: z.string().optional(),
};

// Base product object schema (without refinements)
export const baseProductSchema = z.object({
  ...baseProductSchemaFields,
});

// Schema for creating a new product
export const createProductSchema = baseProductSchema.refine(
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
  ...baseProductSchemaFields,
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

// Schema for product review action
export const productReviewActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().optional(),
});

// Schema for product search and filtering
export const productFilterSchema = z.object({
  search: z.string().optional(),
  categoryId: idSchema.optional(),
  subcategoryId: idSchema.optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'deactivated', 'archived']).optional(),
  featured: z.boolean().optional(),
  vendorId: z.string().optional(),
  cursor: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(10),
  sortBy: z.enum(['createdAt', 'price', 'name']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type ProductFilterInput = z.input<typeof productFilterSchema>;
export type ProductFilterType = z.output<typeof productFilterSchema>;

// Full product record entity schema
export const productSchema = baseProductSchema.extend({
  _id: z.string(),
  slug: z.string(),
  category: z.union([z.string(), z.object({ _id: z.string(), name: z.string(), slug: z.string() })]),
  subcategory: z.union([z.string(), z.object({ _id: z.string(), name: z.string(), slug: z.string() })]),
  reviewNote: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.union([z.string(), z.date()]).optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});

export type ProductType = z.infer<typeof productSchema>;

