import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { baseProductSchema } from '@celebs/shared-types';

import { getProductById } from '../api';
import { hydrateProductForm, toCategoryPath } from '../utils/hydrate-product-form';

import { PRODUCT_QUERY_KEYS } from './use-product-queries';

export type ProductFormValues = Partial<z.infer<typeof baseProductSchema>> &
  Record<string, unknown>;

/**
 * NOTE: intentionally no `resolver` here. React Hook Form skips ALL
 * register/useController validation rules when a resolver is configured,
 * which silently hid every dynamic-field error (images, swatches, SKU
 * matrix...) at submit time. Field rules declared in the field components
 * are now the single source of truth for inline validation.
 */
export const useProductForm = (productId?: string) => {
  const form = useForm<ProductFormValues>({
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

  const { data: productResponse, isLoading: isFetchingProduct } = useQuery({
    queryKey: PRODUCT_QUERY_KEYS.detail(productId ?? ''),
    queryFn: () => getProductById(productId as string),
    enabled: Boolean(productId),
  });

  const categoryPath = useMemo(() => {
    const product = productResponse?.data;
    if (!product) return undefined;
    const cat = product.subcategory || product.category;
    const p = toCategoryPath(cat);
    return p.length > 0 ? p : undefined;
  }, [productResponse]);

  // Hydrate all product fields once the product entity arrives (edit mode only)
  useEffect(() => {
    const product = productResponse?.data;
    if (!product) return;
    const hydrated = hydrateProductForm(product, form.getValues());
    form.reset(hydrated);
  }, [productResponse, form]);

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

  const handleSubcategoryChange = (subcategoryId: string) => {
    form.setValue('subcategoryId', subcategoryId, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return {
    form,
    isLoading: isFetchingProduct,
    categoryPath,
    product: productResponse?.data,
    updateBasicField,
    handleSubcategoryChange,
  };
};
