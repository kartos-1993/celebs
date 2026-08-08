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
  parent: z.string().optional().nullable(),
  attributes: z.array(attributeSchema).optional().default([]),
  sizeChartColumns: z.array(z.string()).optional().default([]),
  imageUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  isActive: z.boolean().optional().default(true),
};

export const baseCategorySchema = z.object(baseCategorySchemaFields);
export const createCategorySchema = baseCategorySchema;
export const updateCategorySchema = baseCategorySchema.partial();

export type AttributeType = z.infer<typeof attributeTypeSchema>;
export type AttributeGroup = z.infer<typeof attributeGroupSchema>;
export type CategoryAttributeType = z.infer<typeof attributeSchema>;
export type BaseCategoryType = z.infer<typeof baseCategorySchema>;
export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
