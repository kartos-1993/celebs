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
  'basic',
  'sale',
  'package',
  'details',
  'termcondition',
  'variant',
]);

export const variantTypeSchema = z.enum(['color', 'size']);

export const attributeSchema = z.object({
  _id: z.string().optional(),
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
  variantType: variantTypeSchema.optional().nullable(),
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

export const createCategorySchema = baseCategorySchema.refine(
  (val) => {
    const attrs = val.attributes || [];
    const axes = attrs
      .filter((a) => a.isVariant && a.variantType)
      .map((a) => a.variantType);
    const unique = new Set(axes);
    return unique.size <= 2;
  },
  {
    message: 'You can select at most two distinct variation types (Color and Size)',
    path: ['attributes'],
  }
);

export const updateCategorySchema = baseCategorySchema.partial().refine(
  (val) => {
    const attrs = val.attributes || [];
    const axes = attrs
      .filter((a) => a && a.isVariant && a.variantType)
      .map((a) => a!.variantType);
    const unique = new Set(axes);
    return unique.size <= 2;
  },
  {
    message: 'You can select at most two distinct variation types (Color and Size)',
    path: ['attributes'],
  }
);

export type AttributeType = z.infer<typeof attributeTypeSchema>;
export type AttributeGroup = z.infer<typeof attributeGroupSchema>;
export type VariantType = z.infer<typeof variantTypeSchema>;
export type CategoryAttributeType = z.infer<typeof attributeSchema>;
export type CreateCategoryType = z.infer<typeof createCategorySchema>;
export type UpdateCategoryType = z.infer<typeof updateCategorySchema>;
