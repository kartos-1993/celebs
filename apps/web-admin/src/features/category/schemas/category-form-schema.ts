import * as z from 'zod';

export const attributeFormInputSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  label: z.string().optional(),
  type: z.enum([
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
  ]),
  values: z.array(z.string()).default([]),
  isRequired: z.boolean().default(false),
  group: z
    .enum(['basic', 'sale', 'package', 'details', 'termcondition', 'variant'])
    .default('basic'),
  placeholder: z.string().optional(),
  info: z
    .object({
      help: z.string().optional(),
      top: z.string().optional(),
    })
    .optional(),
  isVariant: z.boolean().default(false),
  variantType: z.enum(['color', 'size']).optional().nullable(),
  useStandardOptions: z.boolean().default(false),
  optionSetId: z.string().optional().nullable(),
});

export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters'),
  parent: z.string().nullable(),
  attributes: z.array(attributeFormInputSchema).default([]),
  sizeChartColumns: z.array(z.string()).default([]),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type AttributeFormInput = z.infer<typeof attributeFormInputSchema>;
export type CategoryFormData = z.infer<typeof categoryFormSchema>;
