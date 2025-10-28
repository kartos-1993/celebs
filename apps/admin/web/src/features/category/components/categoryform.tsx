import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import React, { useState } from 'react';
import { ProductAPI } from '@/lib/axios-client';

const attributeValueSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  value: z.string(),
});

const localeSchema = z.object({
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

const ruleSchema = z.object({
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

const attributeSchema = z.object({
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
  // Variant and standard options metadata
  isVariant: z.boolean().default(false),
  variantType: z.enum(['color', 'size']).optional().nullable(),
  useStandardOptions: z.boolean().default(false),
  optionSetId: z.string().optional().nullable(),
});

// Update the measurementUnits schema to enforce the unit type
const measurementUnitsSchema = z.record(
  z.object({
    name: z.string().min(1, 'Measurement name is required'),
    unit: z.enum(['inches', 'cm']), // Enforce unit as a union type
  })
);

const categorySchema = z.object({
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
    })).optional(),
    sizes: z.array(z.object({
      name: z.string(),
      measurements: z.record(z.string()).optional()
    })).optional()
  }).optional(),
  measurementUnits: measurementUnitsSchema.default({}),
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

type CategoryFormData = z.infer<typeof categorySchema>;

interface Category {
  _id: string;
  name: string;
  level: number;
  parent: string | null;
  path: string[];
}

interface CategoryFormProps {
  initialData?: any;
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
  categories?: Category[];
}

const CategoryForm = ({
  initialData,
  onSave,
  onCancel,
  categories = [],
}: CategoryFormProps) => {
  const { toast } = useToast();
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: initialData?.parent || null,
      attributes: initialData?.attributes || [],
      hasVariants: initialData?.hasVariants || false,
      hasShippingAttributes: initialData?.hasShippingAttributes || false,
      hasCustomFields: initialData?.hasCustomFields || false,
      variantConfig: {
        colors: [],
        sizes: []
      },
      measurementUnits: initialData?.measurementUnits || {},
      attributeGroups: [
        { name: 'basic', label: 'Basic Information', order: 1, visible: true },
        { name: 'variant', label: 'Variants', order: 2, visible: true },
        { name: 'measurements', label: 'Measurements', order: 3, visible: true },
        { name: 'details', label: 'Product Details', order: 4, visible: true },
        { name: 'images', label: 'Images', order: 5, visible: true }
      ],
    },
  });

  const {
    fields: attributeFields,
    append: appendAttribute,
    remove: removeAttribute,
  } = useFieldArray({
    control: form.control,
    name: 'attributes',
  });

  const handleAddAttribute = () => {
    appendAttribute({
      name: '',
      label: '',
      type: 'text',
      values: [],
      isRequired: false,
      group: 'basic',
      visible: true,
      important: false,
      isVariant: false,
      variantType: null,
      useStandardOptions: false,
      optionSetId: null,
      rule: {
        minWidth: undefined,
        maxWidth: undefined,
        minHeight: undefined,
        maxHeight: undefined,
        maxSize: undefined,
        minSize: undefined,
        ratios: [],
        accept: [],
        locale: {
          heightNoLessThan: '',
          uploadFromLocal: 'Upload',
          uploadText: 'Add Item',
          error: 'Error',
          warning: 'Warning'
        }
      }
    });
  };
  // Normalize measurementUnits to use numbered keys during form submission
  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    const normalizedMeasurementUnits = Object.values(values.measurementUnits).reduce((acc, unit, index) => {
      acc[`unit${index + 1}`] = {
        ...unit,
        unit: unit.unit as 'inches' | 'cm', // Ensure type safety for the unit property
      };
      return acc;
    }, {} as Record<string, { name: string; unit: 'inches' | 'cm' }>);

    const normalizedData = {
      ...values,
      parent:
        values.parent && values.parent !== 'ROOT_CATEGORY'
          ? values.parent
          : null,
      attributes: values.attributes.map((attr) => ({
        name: attr.name,
        label: attr.label,
        type: attr.type,
        values: attr.values ?? [], // Provide a default value of an empty array
        isRequired: attr.isRequired,
        isVariant: attr.isVariant ?? false,
        // If not a variant, force variant metadata off
        variantType: (attr.isVariant ? attr.variantType : null) ?? null,
        useStandardOptions: attr.isVariant ? (attr.useStandardOptions ?? false) : false,
        // Backend expects a valid ObjectId or null. Convert empty string/undefined to null
        optionSetId:
          attr.isVariant && attr.useStandardOptions && typeof attr.optionSetId === 'string'
            ? attr.optionSetId.trim() || null
            : null,
        group: attr.group ?? 'basic',
        ...attr,
      })),
      measurementUnits: normalizedMeasurementUnits,
    };

    console.log('Submitted normalizedData values:', normalizedData);
    onSave(normalizedData);
  };

  // Filter categories to show only potential parents (avoid circular references)
  const availableParents = categories.filter(
    (cat) =>
      cat._id !== initialData?._id && !cat.path?.includes(initialData?._id),
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 py-2 pb-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter category name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Category (Optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || 'ROOT_CATEGORY'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category (leave empty for root category)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ROOT_CATEGORY">
                    No Parent (Root Category)
                  </SelectItem>
                  {availableParents.map((category) => (
                    <SelectItem key={category._id} value={category._id}>
                      {'  '.repeat(category.level - 1)}
                      {category.name} (Level {category.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Features */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-lg font-semibold">Category Features</Label>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hasVariants"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Enable Variants</FormLabel>
                    <div className="text-xs text-gray-500">
                      Allow products in this category to have multiple variations
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasShippingAttributes"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Shipping Attributes</FormLabel>
                    <div className="text-xs text-gray-500">
                      Add shipping-specific fields like weight and dimensions
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasCustomFields"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>Custom Fields</FormLabel>
                    <div className="text-xs text-gray-500">
                      Allow custom fields specific to this category
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Variant Configuration */}
        {form.watch('hasVariants') && (
          <div className="space-y-4 border-t pt-4">
            <Label className="text-lg font-semibold">Variant Configuration</Label>
            
            {/* Color Variants */}
            <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Color Variants</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                // Predefined color options from provided JSON
                const predefinedColors = [
                  { name: "Black", colorCode: "#000000" },
                  { name: "Beige", colorCode: "#F5F5DC" },
                  { name: "Blue", colorCode: "#0000FF" },
                  { name: "Brown", colorCode: "#A52A2A" },
                  { name: "Gold", colorCode: "#FFD700" },
                  { name: "Green", colorCode: "#008000" },
                  { name: "Grey", colorCode: "#808080" },
                  { name: "Multicolor", colorCode: "#FFFFFF" },
                  { name: "Orange", colorCode: "#FFA500" },
                  { name: "Pink", colorCode: "#FFC0CB" },
                  { name: "Purple", colorCode: "#800080" },
                  { name: "Red", colorCode: "#FF0000" },
                  { name: "Silver", colorCode: "#C0C0C0" },
                  { name: "White", colorCode: "#FFFFFF" },
                  { name: "Yellow", colorCode: "#FFFF00" },
                  { name: "Navy Blue", colorCode: "#000080" },
                  { name: "Burgundy", colorCode: "#800020" },
                  { name: "Khaki", colorCode: "#F0E68C" },
                  { name: "Cream", colorCode: "#FFFDD0" },
                  { name: "Maroon", colorCode: "#800000" }
                ];
                form.setValue('variantConfig.colors', predefinedColors);
                toast({
                  title: "Colors Auto-Populated",
                  description: `Added ${predefinedColors.length} color options`,
                  variant: "default",
                });
              }}
            >
              Auto-Fill Colors
            </Button>
          </div>
          <div className="grid gap-4">
            {form.watch('variantConfig.colors')?.map((color, idx) => (
              <div key={idx} className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name={`variantConfig.colors.${idx}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder={`Color name: ${color.name}`} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`variantConfig.colors.${idx}.colorCode`}
                  render={({ field }) => (
                    <FormItem className="w-32">
                      <FormControl>
                        <Input type="color" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const colors = form.getValues('variantConfig.colors') || [];
                    colors.splice(idx, 1);
                    form.setValue('variantConfig.colors', colors);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const colors = form.getValues('variantConfig.colors') || [];
                form.setValue('variantConfig.colors', [...colors, { name: '', colorCode: '#000000' }]);
              }}
            >
              Add Color
            </Button>
          </div>
            </div>

            {/* Size Configuration */}
            <div className="space-y-2">
              <Label>Size Configuration</Label>
              <div className="grid gap-4">
                {form.watch('variantConfig.sizes')?.map((size, idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name={`variantConfig.sizes.${idx}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder={`Size name: ${size.name}`} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const sizes = form.getValues('variantConfig.sizes') || [];
                        sizes.splice(idx, 1);
                        form.setValue('variantConfig.sizes', sizes);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const sizes = form.getValues('variantConfig.sizes') || [];
                    form.setValue('variantConfig.sizes', [...sizes, { name: '' }]);
                  }}
                >
                  Add Size
                </Button>
              </div>
            </div>

            {/* Measurement Units */}
            <div className="space-y-2">
              <Label>Measurement Units</Label>
              <div className="grid gap-4">
                {Object.entries(form.watch('measurementUnits') || {}).map(([key], idx) => (
                  <div key={idx} className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name={`measurementUnits.${key}.name` as const}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Measurement Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter measurement name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`measurementUnits.${key}.unit` as const}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="inches">Inches</SelectItem>
                              <SelectItem value="cm">Centimeters</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const measurementUnits = { ...form.getValues('measurementUnits') };
                        delete measurementUnits[key];
                        form.setValue('measurementUnits', measurementUnits);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const measurementUnits = { ...form.getValues('measurementUnits') };
                    const newKey = `unit${Object.keys(measurementUnits).length + 1}`;
                    measurementUnits[newKey] = { name: '', unit: 'inches' };
                    form.setValue('measurementUnits', measurementUnits);
                  }}
                >
                  Add Measurement Unit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Attribute Groups */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-lg font-semibold">Attribute Groups</Label>
          <div className="grid gap-4">
            {form.getValues('attributeGroups')?.map((group, idx) => (
              <div key={group.name} className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name={`attributeGroups.${idx}.visible`}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>{group.label}</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributeGroups.${idx}.order`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Order"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Attributes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAttribute}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Attribute
            </Button>
          </div>

          {attributeFields.map((field, index) => (
            <AttributeFieldSet
              key={field.id}
              index={index}
              form={form}
              onRemove={() => removeAttribute(index)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          {' '}
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-fashion-700 hover:bg-fashion-800 dark:bg-fashion-600 dark:hover:bg-fashion-700 dark:text-white"
          >
            Save Category
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Update the AttributeFieldSet component with dark mode support
const AttributeFieldSet = ({
  index,
  form,
  onRemove,
}: {
  index: number;
  form: any;
  onRemove: () => void;
}) => {
  const attributeType = form.watch(`attributes.${index}.type`);
  const isVariant = form.watch(`attributes.${index}.isVariant`);
  const variantType = form.watch(`attributes.${index}.variantType`);
  const useStandardOptions = form.watch(
    `attributes.${index}.useStandardOptions`,
  );
  // const optionSetId = form.watch(`attributes.${index}.optionSetId`);

  const {
    fields: valueFields,
    append: appendValue,
    remove: removeValue,
  } = useFieldArray({
    control: form.control,
    name: `attributes.${index}.values`,
  });

  const handleAddValue = () => {
    appendValue({ id: crypto.randomUUID(), name: '', value: '' });
  };

  const showRules = ['image', 'video', 'mainImage', 'marketImages'].includes(attributeType);
  const showMultiLanguage = ['text', 'richText', 'translateInput', 'listEditor'].includes(attributeType);
  const showMaxItems = ['image', 'video', 'marketImages', 'mainImage', 'listEditor'].includes(attributeType);

  // Dialog state for confirming delete
  const [open, setOpen] = useState(false);

  // New: option sets support
  const [optionSets, setOptionSets] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingSets, setLoadingSets] = useState(false);

  const fetchOptionSets = async (kind?: 'color' | 'size') => {
    if (!kind) return setOptionSets([]);
    try {
      setLoadingSets(true);
      const res = await ProductAPI.get(`/option-sets`, { params: { type: kind } });
      const data = res.data;
      setOptionSets(data?.data ?? data ?? []);
    } catch (e) {
      setOptionSets([]);
    } finally {
      setLoadingSets(false);
    }
  };

  const applyOptionSet = async (id?: string | null) => {
    if (!id) return;
    try {
      const res = await ProductAPI.get(`/option-sets/${id}`);
      const data = res.data;
      const values: string[] = (data?.data?.values ?? data?.values ?? [])
        .map((v: any) => (typeof v === 'string' ? v : v?.label ?? v?.name ?? ''))
        .filter(Boolean);
      form.setValue(`attributes.${index}.values`, values, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } catch {}
  };

  // Load sets when toggled/changed
  React.useEffect(() => {
    if (useStandardOptions && isVariant && (variantType === 'color' || variantType === 'size')) {
      fetchOptionSets(variantType as 'color' | 'size');
    } else {
      setOptionSets([]);
    }
     
  }, [useStandardOptions, isVariant, variantType]);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Attribute {index + 1}
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => setOpen(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs" >
            <DialogHeader>
              <DialogTitle>Delete Attribute</DialogTitle>
            </DialogHeader>
            <div className="py-2" id="dialog-description">
              Are you sure you want to delete this attribute?
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onRemove();
                  setOpen(false);
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name={`attributes.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attribute Name</FormLabel>
              <FormControl>
                <Input placeholder="Attribute name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Info Fields */}
        <div className="col-span-2 space-y-2">
          <FormField
            control={form.control}
            name={`attributes.${index}.info.help`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Help Text</FormLabel>
                <FormControl>
                  <Input placeholder="Help text for this field" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`attributes.${index}.info.top`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Top Description</FormLabel>
                <FormControl>
                  <Input placeholder="Description shown above the field" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Placeholder */}
        <FormField
          control={form.control}
          name={`attributes.${index}.placeholder`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placeholder</FormLabel>
              <FormControl>
                <Input placeholder="Field placeholder text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`attributes.${index}.label`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Label</FormLabel>
              <FormControl>
                <Input placeholder="Display label" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`attributes.${index}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="richText">Rich Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="marketImages">Market Images</SelectItem>
                  <SelectItem value="mainImage">Main Image</SelectItem>
                  <SelectItem value="customEditor">Custom Editor</SelectItem>
                  <SelectItem value="translateInput">Translate Input</SelectItem>
                  <SelectItem value="listEditor">List Editor</SelectItem>
                  <SelectItem value="packageWeight">Package Weight</SelectItem>
                  <SelectItem value="packageVolume">Package Volume</SelectItem>
                  <SelectItem value="color-with-image">Color with Image</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Variation controls */}
      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name={`attributes.${index}.isVariant`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-gray-900 dark:text-gray-100">Use as variation</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`attributes.${index}.variantType`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variation type</FormLabel>
              <Select
                onValueChange={(v) => {
                  field.onChange(v);
                  // clear set when type changes
                  form.setValue(`attributes.${index}.optionSetId`, null);
                }}
                value={(field.value as any) || undefined}
                disabled={!isVariant}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isVariant ? 'Select type' : 'Disabled'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={`attributes.${index}.isRequired`}
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-gray-900 dark:text-gray-100">
                Required field
              </FormLabel>
            </div>
          </FormItem>    
        )}
      />

      <FormField
        control={form.control}
        name={`attributes.${index}.group`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="package">Package</SelectItem>
                <SelectItem value="details">Details</SelectItem>
                <SelectItem value="termcondition">Terms & Conditions</SelectItem>
                <SelectItem value="variant">Variant</SelectItem>
                <SelectItem value="desc">Description</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* UI Type Configuration */}
      <FormField
        control={form.control}
        name={`attributes.${index}.uiType`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>UI Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select UI type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="input">Input</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="multiselect">Multi-select</SelectItem>
                <SelectItem value="marketImages">Market Images</SelectItem>
                <SelectItem value="mainImage">Main Image</SelectItem>
                <SelectItem value="customEditor">Custom Editor</SelectItem>
                <SelectItem value="translateInput">Translate Input</SelectItem>
                <SelectItem value="listEditor">List Editor</SelectItem>
                <SelectItem value="packageWeight">Package Weight</SelectItem>
                <SelectItem value="packageVolume">Package Volume</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Visibility and Importance */}
      <div className="flex space-x-4">
        <FormField
          control={form.control}
          name={`attributes.${index}.visible`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Visible</FormLabel>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`attributes.${index}.important`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Important</FormLabel>
            </FormItem>
          )}
        />
      </div>

      {/* Max Items Configuration */}
      {showMaxItems && (
        <FormField
          control={form.control}
          name={`attributes.${index}.maxItems`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Items</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Multi-language Support */}
      {showMultiLanguage && (
        <FormField
          control={form.control}
          name={`attributes.${index}.multiLanguage.enabled`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Enable Multi-language</FormLabel>
            </FormItem>
          )}
        />
      )}

      {/* Rules Configuration */}
      {/* Image Configuration */}
      {['image', 'marketImages', 'mainImage'].includes(attributeType) && (
        <div className="space-y-4 border-t pt-4 mt-4">
          <Label>Image Configuration</Label>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`attributes.${index}.longImageShow`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Show Long Image</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.squareImageShow`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Show Square Image</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.allowEmpty`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Allow Empty</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.showImageBankBtn`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Show Image Bank</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {/* Upload Configuration */}
      {['image', 'marketImages', 'mainImage', 'video'].includes(attributeType) && (
        <div className="space-y-4 border-t pt-4 mt-4">
          <Label>Upload Configuration</Label>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`attributes.${index}.uploadConfig.mediaLocalUpload`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Allow Local Upload</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.uploadConfig.dragable`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Allow Drag & Drop</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.uploadConfig.multiple`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel>Allow Multiple</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {/* Validation Rules */}
      {showRules && (
        <div className="space-y-4 border-t pt-4 mt-4">
          <Label>Validation Rules</Label>
          <div className="grid grid-cols-2 gap-4">
            {/* Image Rules */}
            {['image', 'marketImages', 'mainImage'].includes(attributeType) && (
              <>
                <FormField
                  control={form.control}
                  name={`attributes.${index}.rule.minWidth`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Width (px)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributes.${index}.rule.maxWidth`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Width (px)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributes.${index}.rule.minHeight`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Height (px)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributes.${index}.rule.maxHeight`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Height (px)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributes.${index}.rule.maxSize`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Size (bytes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Measurement Rules */}
            {attributeType === 'measurement-group' && (
              <>
                <FormField
                  control={form.control}
                  name={`attributes.${index}.measurementType`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Measurement Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select measurement type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="product">Product Measurements</SelectItem>
                          <SelectItem value="body">Body Measurements</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`attributes.${index}.unit`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inches">Inches</SelectItem>
                          <SelectItem value="cm">Centimeters</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </div>
      )}

      {(attributeType === 'select' || attributeType === 'multiselect') && (
        <div className="space-y-3">
          {/* Standard options controls */}
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name={`attributes.${index}.useStandardOptions`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val);
                        if (!val) {
                          form.setValue(`attributes.${index}.optionSetId`, null);
                        }
                      }}
                      disabled={!isVariant || !variantType}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-gray-900 dark:text-gray-100">Use standard options</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`attributes.${index}.optionSetId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Option set</FormLabel>
                  <Select
                    onValueChange={async (v) => {
                      field.onChange(v);
                      await applyOptionSet(v);
                    }}
                    value={(field.value as any) || undefined}
                    disabled={!useStandardOptions || !isVariant || !variantType || loadingSets}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingSets ? 'Loading…' : 'Select set'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {optionSets.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Manual options list (still editable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-900 dark:text-gray-100">Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddValue}
                className="border-gray-200 dark:border-gray-800"
                disabled={loadingSets}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {valueFields.map((valueField, valueIndex) => (
                <div key={valueField.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`attributes.${index}.values.${valueIndex}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Option name"
                            {...field}
                            className="bg-white dark:bg-gray-950"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`attributes.${index}.values.${valueIndex}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Option value"
                            {...field}
                            className="bg-white dark:bg-gray-950"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeValue(valueIndex)}
                    className="border-gray-200 dark:border-gray-800"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryForm;
