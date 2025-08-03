import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categorySchema, type CategoryFormData } from './schemas';
import type { Category } from './types';
import { useToast } from '@/hooks/use-toast';

interface UseCategoryFormProps {
  initialData?: CategoryFormData & { _id?: string };
  onSave: (data: CategoryFormData) => Promise<void>;
  categories?: Category[];
}

interface UseCategoryFormReturn {
  form: ReturnType<typeof useForm<CategoryFormData>>;
  isSubmitting: boolean;
  handleSubmit: (values: CategoryFormData) => Promise<void>;
  handleAddAttribute: () => void;
  attributeFields: ReturnType<typeof useFieldArray<CategoryFormData, 'attributes', 'id'>>['fields'];
  removeAttribute: (index: number) => void;
  availableParents: Category[];
}

const DEFAULT_ATTRIBUTE = {
  name: '',
  label: '',
  type: 'text' as const,
  values: [],
  isRequired: false,
  group: 'basic',
  visible: true,
  important: false,
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
};


export const useCategoryForm = ({
  initialData,
  onSave,
  categories = []
}: UseCategoryFormProps): UseCategoryFormReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || '',
      parent: initialData?.parent || null,
      attributes: initialData?.attributes || [],
      hasVariants: initialData?.hasVariants ?? true,
      hasShippingAttributes: initialData?.hasShippingAttributes ?? true,
      hasCustomFields: initialData?.hasCustomFields ?? false,
      variantConfig: {
        colors: initialData?.variantConfig?.colors || [],
        sizes: initialData?.variantConfig?.sizes || [],
        measurementUnits: initialData?.variantConfig?.measurementUnits || []
      },
      variantAttributes: initialData?.variantAttributes || ['Color', 'Size'],
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

  const handleAddAttribute = useCallback(() => {
    appendAttribute(DEFAULT_ATTRIBUTE);
  }, [appendAttribute]);

  const handleSubmit = async (values: CategoryFormData) => {
    try {
      setIsSubmitting(true);
      
      // Filter out Color and Size from attributes if they exist
      const filteredAttributes = values.attributes.filter(
        attr => !['Color', 'Size'].includes(attr.name)
      );

      // Ensure variantConfig always exists
      const variantConfig = values.variantConfig || {
        colors: [],
        sizes: [],
        measurementUnits: []
      };

      // Debug: Log what we have
      console.log('Form values variantConfig:', variantConfig);

      const normalizedData = {
        ...values,
        parent: values.parent ?? null,
        attributes: filteredAttributes.map((attr) => ({
          ...attr,
          label: attr.label || attr.name,
          values: attr.values ?? [],
          visible: attr.visible ?? true,
          important: attr.important ?? false,
        })),
        hasVariants: values.hasVariants ?? true,
        variantAttributes: values.variantAttributes ?? ['Color', 'Size'],
        variantConfig: {
          colors: (variantConfig.colors || []).map(color => ({
            name: color.name || '',
            colorCode: color.colorCode || '#000000'
          })),
          sizes: (variantConfig.sizes || []).map(size => ({
            name: size.name || ''
          })),
          measurementUnits: (variantConfig.measurementUnits || []).map(unit => ({
            name: unit.name || '',
            label: unit.label || unit.name || '',
            unit: unit.unit || 'inches'
          })),
        },
        hasShippingAttributes: values.hasShippingAttributes ?? true,
        hasCustomFields: values.hasCustomFields ?? false,
      };

      console.log('Sending data:', normalizedData);

      await onSave(normalizedData);
    } catch (error) {
      console.error('Failed to save category:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save category. Please try again.',
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableParents = categories.filter((cat) => {
    if (!initialData?._id) return true;
    return cat._id !== initialData._id && !cat.path?.includes(initialData._id);
  });

  return {
    form: form as ReturnType<typeof useForm<CategoryFormData>>,
    isSubmitting,
    handleSubmit,
    handleAddAttribute,
    attributeFields,
    removeAttribute,
    availableParents,
  };
};
