import { z } from 'zod';

export const attributeTypeSchema = z.enum([
  'text',
  'select',
  'multiselect',
  'number',
  'boolean',
  'richText',
  'image',
  'video',
  'marketImages',
  'mainImage',
  'customEditor',
  'translateInput',
  'listEditor',
  'packageWeight',
  'packageVolume',
  'color-with-image',
  'measurement-group',
  'size-guide',
]);

export const attributeGroupSchema = z.enum([
  'base',
  'basic',
  'sale',
  'package',
  'details',
  'termcondition',
  'variant',
]);

export const attributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Attribute name is required'),
  label: z.string().optional().nullable(),
  type: attributeTypeSchema,
  values: z.array(z.string()).optional().default([]),
  isRequired: z.boolean().optional().default(false),
  group: attributeGroupSchema.optional().default('basic'),
  placeholder: z.string().optional().nullable(),
  info: z
    .object({
      help: z.string().optional().nullable(),
      top: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  isVariant: z.boolean().optional().default(false),
  useStandardOptions: z.boolean().optional().default(false),
  optionSetId: z.string().optional().nullable(),
});

export const baseCategorySchemaFields = {
  name: z.string().trim().min(1, 'Category name is required').max(100),
  parentCategory: z.string().optional().nullable(),
  attributes: z.array(attributeSchema).optional().default([]),
  sizeChartColumns: z.array(z.string()).optional().default([]),
  bodyChartColumns: z.array(z.string()).optional().default([]),
  imageUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  isActive: z.boolean().optional().default(true),
};

export const baseCategorySchema = z.object(baseCategorySchemaFields);
export const createCategorySchema = baseCategorySchema;
export const updateCategorySchema = baseCategorySchema.partial();

import { idParamSchema, slugParamSchema } from './common.validator';

export const recordRecentCategorySchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
});

export const categoryIdParamSchema = idParamSchema;
export const categorySlugParamSchema = slugParamSchema;

export const categoryPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().max(100).optional(),
  activeOnly: z.coerce.boolean().optional().default(false),
});

export const categorySearchQuerySchema = z.object({
  q: z.string().trim().default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateCategoryAttributesSchema = z.object({
  attributes: z.array(attributeSchema),
});

// Quick Filter Schemas
export const quickFilterTypeSchema = z.enum(['subcategory', 'attribute', 'tag', 'collection']);
export const quickFilterDisplayAsSchema = z.enum(['avatar_scroll', 'chip_list', 'color_swatch']);

export const quickFilterItemSchema = z.object({
  name: z.string().trim().min(1, 'Filter item name is required'),
  image: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  filterValue: z.string().nullable().optional(),
  displayOrder: z.number().int().optional().default(0),
});

export const quickFilterSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, 'Category ID is required'),
  type: quickFilterTypeSchema,
  attributeId: z.string().nullable().optional(),
  displayAs: quickFilterDisplayAsSchema,
  items: z.array(quickFilterItemSchema).optional().default([]),
  autoPopulate: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type AttributeType = z.infer<typeof attributeTypeSchema>;
export type AttributeGroup = z.infer<typeof attributeGroupSchema>;
export type CategoryAttributeType = z.infer<typeof attributeSchema>;
export type BaseCategoryType = z.infer<typeof baseCategorySchema>;
export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
export type RecordRecentCategoryType = z.infer<typeof recordRecentCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type CategorySlugParam = z.infer<typeof categorySlugParamSchema>;
export type CategoryPaginationQuery = z.infer<typeof categoryPaginationQuerySchema>;
export type CategorySearchQueryType = z.infer<typeof categorySearchQuerySchema>;
export type UpdateCategoryAttributesInput = z.infer<typeof updateCategoryAttributesSchema>;
export type QuickFilterType = z.infer<typeof quickFilterTypeSchema>;
export type QuickFilterDisplayAs = z.infer<typeof quickFilterDisplayAsSchema>;
export type QuickFilterItem = z.infer<typeof quickFilterItemSchema>;
export type QuickFilter = z.infer<typeof quickFilterSchema>;
