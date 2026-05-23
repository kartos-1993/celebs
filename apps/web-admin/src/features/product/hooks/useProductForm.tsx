import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(200, 'Product name must be less than 200 characters'),
  brand: z
    .string()
    .trim()
    .max(100, 'Brand must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(4000, 'Description must be less than 4000 characters'),
  categoryId: z.string().trim().min(1, 'Category is required'),
  subcategoryId: z.string().trim().min(1, 'Subcategory is required'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});

export type ProductFormValues = z.infer<typeof productFormSchema> &
  Record<string, unknown>;

export const useProductForm = (_productId?: string) => {
  const [isLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      brand: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      status: 'draft',
    },
    mode: 'onChange',
    shouldUnregister: true,
  });

  const updateBasicField = (
    name: keyof Pick<ProductFormValues, 'name' | 'brand' | 'description'>,
    value: string,
  ) => {
    form.setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    form.setValue('categoryId', categoryId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue('subcategoryId', '', {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    form.setValue('subcategoryId', subcategoryId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return {
    form,
    isLoading,
    updateBasicField,
    handleCategoryChange,
    handleSubcategoryChange,
  };
};
