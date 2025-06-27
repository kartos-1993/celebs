import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ProductFormData,
  ValidationStatus,
  ProductAttribute,
} from '../types/product';
import { categoryService } from '../categoryService';
import { useToast } from '@/hooks/use-toast';

const productFormSchema = z.object({
  name: z
    .string()
    .min(5, 'Product name must be at least 5 characters')
    .max(100, 'Product name must be less than 100 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  price: z
    .string()
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Price must be a positive number',
    ),
  discountPrice: z
    .string()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) >= 0),
      'Discount price must be valid',
    )
    .optional(),
  status: z.string(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export const useProductForm = (productId?: string) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({
    basicInfo: false,
    attributes: false,
    sizeChart: false,
    variants: false,
    images: false,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      price: '',
      discountPrice: '',
      status: 'active',
    },
    mode: 'onChange',
  });

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    price: '',
    discountPrice: '',
    status: 'active',
    attributes: [],
    variants: [],
    sizeChart: [],
    images: [],
  });

  // Load dynamic attributes when subcategory changes
  const loadSubcategoryAttributes = async (subcategoryId: string) => {
    if (!subcategoryId) return;

    setIsLoading(true);
    try {
      const subcategoryDetails =
        await categoryService.getSubcategoryDetails(subcategoryId);

      setFormData((prev) => ({
        ...prev,
        attributes: subcategoryDetails.attributes.map((attr) => ({
          ...attr,
          value: attr.type === 'multiselect' ? [] : '',
        })),
      }));

      toast({
        title: 'Form Updated',
        description: `Loaded ${subcategoryDetails.attributes.length} attributes for ${subcategoryDetails.name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load category attributes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validation functions
  const getValidationErrors = (section: keyof ValidationStatus): string[] => {
    const errors: string[] = [];

    switch (section) {
      case 'basicInfo':
        if (!formData.name) errors.push('Product name is required');
        if (!formData.categoryId) errors.push('Category is required');
        if (!formData.subcategoryId) errors.push('Subcategory is required');
        if (!formData.price || Number(formData.price) <= 0)
          errors.push('Valid price is required');
        if (!formData.description || formData.description.length < 20) {
          errors.push('Description must be at least 20 characters');
        }
        break;

      case 'attributes':
        const requiredAttributes = formData.attributes.filter(
          (attr) => attr.required,
        );
        const emptyRequired = requiredAttributes.filter(
          (attr) =>
            attr.value === '' ||
            (Array.isArray(attr.value) && attr.value.length === 0),
        );
        if (emptyRequired.length > 0) {
          errors.push(
            `Required attributes missing: ${emptyRequired.map((a) => a.name).join(', ')}`,
          );
        }
        break;

      case 'variants':
        if (formData.variants.length === 0) {
          errors.push('At least one color variant is required');
        }
        break;

      case 'images':
        if (formData.images.length === 0) {
          errors.push('At least one product image is required');
        }
        break;
    }

    return errors;
  };

  // Update validation status whenever form data changes
  useEffect(() => {
    const newStatus: ValidationStatus = {
      basicInfo: getValidationErrors('basicInfo').length === 0,
      attributes: getValidationErrors('attributes').length === 0,
      sizeChart: getValidationErrors('sizeChart').length === 0,
      variants: getValidationErrors('variants').length === 0,
      images: getValidationErrors('images').length === 0,
    };
    setValidationStatus(newStatus);
  }, [formData]);

  const updateFormData = (updates: Partial<ProductFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const handleCategoryChange = async (categoryId: string) => {
    updateFormData({
      categoryId,
      subcategoryId: '',
      attributes: [],
    });
    form.setValue('categoryId', categoryId);
    form.setValue('subcategoryId', '');
  };

  const handleSubcategoryChange = async (subcategoryId: string) => {
    updateFormData({ subcategoryId });
    form.setValue('subcategoryId', subcategoryId);
    await loadSubcategoryAttributes(subcategoryId);
  };

  return {
    form,
    formData,
    validationStatus,
    isLoading,
    isDirty,
    updateFormData,
    handleCategoryChange,
    handleSubcategoryChange,
    loadSubcategoryAttributes,
    getValidationErrors,
    setIsDirty,
  };
};
