import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { baseProductSchema, type CreateProductType } from '@celebs/shared-types';
import { getProductById } from '../api';
import { PRODUCT_QUERY_KEYS } from './use-product-queries';
import { hydrateProductForm, toCategoryPath } from '../utils/hydrate-product-form';

export type ProductFormValues = Partial<CreateProductType> & Record<string, unknown>;

const productFormBasicSchema = baseProductSchema.partial();

export const useProductForm = (productId?: string) => {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormBasicSchema) as unknown as ReturnType<
      typeof zodResolver<ProductFormValues>
    >,
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
