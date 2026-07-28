import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { baseProductSchema, type CreateProductType } from '@celebs/shared-types';

export type ProductFormValues = Partial<CreateProductType> & Record<string, unknown>;

const productFormBasicSchema = baseProductSchema.partial();


export const useProductForm = (_productId?: string) => {
  const [isLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormBasicSchema),
    defaultValues: {
      name: '',
      brand: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      status: 'draft',
    },
    mode: 'onChange',
    shouldUnregister: false,
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
