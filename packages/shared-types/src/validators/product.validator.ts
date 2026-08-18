import { z } from 'zod';

// UUID validator for entity primary and foreign keys
export const idSchema = z.string().uuid('Invalid UUID');

// Product measurement schema
export const productMeasurementSchema = z.object({
  name: z.string().trim().min(1, 'Measurement name is required'),
  value: z.string().trim().optional().or(z.literal('')).default(''),
  unit: z.string().trim().optional().default('cm'),
});

// Body measurement schema
export const bodyMeasurementSchema = z.object({
  name: z.string().trim().min(1, 'Measurement name is required'),
  value: z.string().trim().optional().or(z.literal('')).default(''),
  unit: z.string().trim().optional().default('cm'),
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

// Color variant schema (Legacy Apparel Format)
export const colorVariantSchema = z.object({
  name: z.string().trim().min(1, 'Color name is required'),
  colorCode: z.string().trim().min(1, 'Color code is required'),
  images: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
  stocks: z.array(stockSchema).optional().default([]),
});

// Universal Dynamic SKU Matrix item schema
export const skuItemSchema = z.object({
  id: z.string().optional(),
  skuCode: z.string().trim().min(1, 'SKU code is required'),
  selectedOptions: z.record(z.string(), z.string()),
  price: z.number().positive('Price must be positive'),
  discountedPrice: z.number().positive('Discounted price must be positive').optional().nullable(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')).nullable(),
  isDefault: z.boolean().optional().default(false),
});

// Dynamic Variant Option schema
export const variantOptionSchema = z.object({
  name: z.string().trim().min(1, 'Option name is required'),
  values: z.array(z.string()).min(1, 'At least one option value is required'),
});

// Dynamic Variant Meta item for UI field generators
export const dynamicVariantMetaSchema = z.object({
  key: z.string(),
  label: z.string(),
  values: z.array(z.string()),
});

// Customer interactive Fit Recommender input
export const findMySizeInputSchema = z.object({
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(200),
  preferredFit: z.enum(['SNUG', 'REGULAR', 'RELAXED']).default('REGULAR'),
  gender: z.enum(['MEN', 'WOMEN', 'UNISEX']).default('UNISEX'),
});

export type ProductMeasurementType = z.infer<typeof productMeasurementSchema>;
export type BodyMeasurementType = z.infer<typeof bodyMeasurementSchema>;
export type ProductSizeType = z.infer<typeof sizeSchema>;
export type ProductStockType = z.infer<typeof stockSchema>;
export type ProductColorVariantType = z.infer<typeof colorVariantSchema>;
export type SkuItemType = z.infer<typeof skuItemSchema>;
export type VariantOptionType = z.infer<typeof variantOptionSchema>;
export type DynamicVariantMetaType = z.infer<typeof dynamicVariantMetaSchema>;
export type FindMySizeInputType = z.infer<typeof findMySizeInputSchema>;

// Base product schema fields
const baseProductSchemaFields = {
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200),
  brandId: idSchema.optional().nullable(),
  brand: z.string().trim().max(100).optional().or(z.literal('')).nullable(),
  description: z
    .string()
    .trim()
    .max(4000, 'Description must be less than 4000 characters')
    .optional()
    .or(z.literal(''))
    .default(''),
  price: z.number().positive('Price must be positive'),
  discountedPrice: z.number().positive('Discounted price must be positive').optional().nullable(),
  categoryId: idSchema,
  subcategoryId: idSchema,
  sizes: z.array(sizeSchema).optional().default([]),
  colorVariants: z.array(colorVariantSchema).optional().default([]),
  skus: z.array(skuItemSchema).optional().default([]),
  variantOptions: z.array(variantOptionSchema).optional().default([]),
  mainImages: z.array(z.string().url('Image must be a valid URL')).optional().default([]),
  dynamicData: z.record(z.unknown()).optional().default({}),
  tags: z.array(z.string()).optional().default([]),
  featured: z.boolean().optional().default(false),
  status: z
    .enum(['draft', 'pending_review', 'published', 'rejected', 'deactivated', 'archived'])
    .default('draft'),
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
  },
);

// Schema for updating an existing product
export const updateProductSchema = z
  .object({
    ...baseProductSchemaFields,
  })
  .partial()
  .refine(
    (data) => {
      if (data.discountedPrice && data.price && data.discountedPrice >= data.price) {
        return false;
      }
      return true;
    },
    {
      message: 'Discounted price must be less than the regular price',
      path: ['discountedPrice'],
    },
  );

// Schema for getting a single product by ID
export const getProductByIdSchema = z.object({
  id: idSchema,
});

// Schema for updating product stock
export const updateProductStockSchema = z.object({
  productId: idSchema,
  colorVariantName: z.string().trim().optional(),
  skuCode: z.string().trim().optional(),
  stocks: z.array(stockSchema).optional(),
  stock: z.number().int().min(0).optional(),
});

// Schema for product review action
export const productReviewActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().optional(),
  rejectionCategory: z.string().trim().optional(),
  rejectionSubcategories: z.array(z.string()).optional(),
  rejectionFields: z.array(z.string()).optional(),
});

export type ProductReviewActionType = z.infer<typeof productReviewActionSchema>;

// Schema for product search and filtering
export const productFilterSchema = z.object({
  search: z.string().optional(),
  categoryId: idSchema.optional(),
  subcategoryId: idSchema.optional(),
  category: z.string().optional(),
  brandId: idSchema.optional(),
  brand: z.string().optional(),
  tag: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  status: z
    .enum(['draft', 'pending_review', 'published', 'rejected', 'deactivated', 'archived'])
    .optional(),
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
  id: z.string(),
  slug: z.string(),
  category: z.union([z.string(), z.object({ id: z.string(), name: z.string(), slug: z.string() })]),
  subcategory: z.union([
    z.string(),
    z.object({ id: z.string(), name: z.string(), slug: z.string() }),
  ]),
  brandRef: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      logoUrl: z.string().nullable().optional(),
      tier: z.string().optional(),
    })
    .optional()
    .nullable(),
  reviewNote: z.string().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.union([z.string(), z.date()]).optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});

export type CreateProductType = z.input<typeof createProductSchema>;
export type UpdateProductType = z.input<typeof updateProductSchema>;
export type ProductType = z.infer<typeof productSchema>;
