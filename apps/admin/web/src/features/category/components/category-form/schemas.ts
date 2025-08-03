import * as z from "zod";

export const attributeValueSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.string(),
});

export const localeSchema = z.object({
  heightNoLessThan: z.string().optional(),
  uploadFromLocal: z.string().optional(),
  uploadText: z.string().optional(),
  error: z.string().optional(),
  uploadFailedTryAgain: z.string().optional(),
  redundant: z.string().optional(),
  fixedHeight: z.string().optional(),
  mediaSelect: z.string().optional(),
  heightNoMoreThan: z.string().optional(),
  viewExample: z.string().optional(),
  fixedSize: z.string().optional(),
  tooSmall: z.string().optional(),
  warning: z.string().optional(),
  uploadFromBank: z.string().optional(),
  reachMaxMsg: z.string().optional(),
  widthNoLessThan: z.string().optional(),
  fixedWidth: z.string().optional(),
  tooLarge: z.string().optional(),
  systemAbnormal: z.string().optional(),
  imageBank: z.string().optional(),
  viewExampleTitle: z.string().optional(),
  ratioIllegal: z.string().optional(),
  noSizeInfo: z.string().optional(),
  widthNoMoreThan: z.string().optional(),
  extIllegal: z.string().optional(),
});

export const ruleSchema = z.object({
  minHeight: z.number().optional(),
  maxHeight: z.number().optional(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  maxSize: z.number().optional(),
  minSize: z.number().optional(),
  ratios: z.array(z.string()).optional(),
  accept: z.array(z.string()).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  tips: z.array(z.string()).optional(),
  locale: localeSchema.optional(),
});

export const attributeSchema = z.object({
  name: z.string().min(1, 'Attribute name is required'),
  label: z.string().min(1, 'Label is required'),
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
    'size-guide'
  ]),
  values: z.array(attributeValueSchema).default([]),
  isRequired: z.boolean().default(false),
  group: z.string().min(1, 'Group is required'),
  uiType: z.string().optional(),
  visible: z.boolean().default(true),
  placeholder: z.string().optional(),
  important: z.boolean().default(false),
  maxItems: z.number().optional(),
  showCounter: z.boolean().optional(),
  longImageShow: z.boolean().optional(),
  squareImageShow: z.boolean().optional(),
  showPromptImage: z.boolean().optional(),
  allowEmpty: z.boolean().optional(),
  showImageBankBtn: z.boolean().optional(),
  isOrder: z.boolean().optional(),
  readonly: z.boolean().optional(),
  hasMediaCenter: z.boolean().optional(),
  illegalPatterns: z.array(z.any()).optional(),
  prompts: z.array(z.string()).optional(),
  multiLanguage: z.object({
    dialog: z.any().optional(),
    iconType: z.string().optional(),
    enabled: z.boolean().optional(),
  }).optional(),
  rule: ruleSchema.optional(),
  suggest: z.object({
    minHeight: z.number().optional(),
    maxHeight: z.number().optional(),
    minWidth: z.number().optional(),
    maxWidth: z.number().optional(),
    iconType: z.string().optional(),
  }).optional(),
  info: z.object({
    help: z.string().optional(),
    top: z.string().optional(),
  }).optional(),
  imageBankConfig: z.object({
    dialogType: z.string().optional(),
    sendDataType: z.string().optional(),
    winInfo: z.object({
      height: z.number().optional(),
    }).optional(),
    newMediaCenter: z.boolean().optional(),
    disabled: z.boolean().optional(),
    openTabUrl: z.boolean().optional(),
    config: z.object({
      height: z.number().optional(),
    }).optional(),
    url: z.string().optional(),
  }).optional(),
  uploadConfig: z.object({
    mediaLocalUpload: z.boolean().optional(),
    dragable: z.boolean().optional(),
    picUploadApi: z.string().optional(),
    uploaderType: z.string().optional(),
    multiple: z.boolean().optional(),
    params: z.any().optional(),
  }).optional(),
  checkNotice: z.object({
    method: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
  titleSuggestion: z.object({
    method: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
});

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters'),
  parent: z.string().nullable(),
  attributes: z.array(attributeSchema).default([]),
  hasVariants: z.boolean().default(false),
  variantAttributes: z.array(z.string()).default([]),
  hasShippingAttributes: z.boolean().default(false),
  hasCustomFields: z.boolean().default(false),
  dict: z.record(z.string()).optional(),
  locale: z.record(z.string()).optional(),
  variantConfig: z.object({
    colors: z.array(z.object({
      name: z.string(),
      colorCode: z.string(),
      image: z.string().optional()
    })).default([]),
    sizes: z.array(z.object({
      name: z.string(),
      measurements: z.record(z.string()).optional()
    })).default([]),
    measurementUnits: z.array(z.object({
      name: z.string(),
      unit: z.string().default('inches'),
      label: z.string(),
      order: z.number().optional()
    })).default([]),
  }),
  attributeGroups: z.array(z.object({
    name: z.string(),
    label: z.string(),
    order: z.number().optional(),
    visible: z.boolean().default(true),
  })).default([
    { name: 'basic', label: 'Basic Information', order: 1 },
    { name: 'sale', label: 'Price & Stock', order: 2 },
    { name: 'package', label: 'Package & Shipping', order: 3 },
    { name: 'details', label: 'Product Details', order: 4 },
    { name: 'desc', label: 'Description', order: 5 },
    { name: 'termcondition', label: 'Terms & Conditions', order: 6 },
    { name: 'variant', label: 'Variants', order: 7 },
  ]),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
