import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { baseProductSchema, type CreateProductType } from '@celebs/shared-types';
import { getProductById } from '../api';
import { PRODUCT_QUERY_KEYS } from './use-product-queries';

export type ProductFormValues = Partial<CreateProductType> & Record<string, unknown>;

const productFormBasicSchema = baseProductSchema.partial();



/** API category refs can be plain ids or populated objects — normalize both. */
const toId = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return String((value as { id?: string | number }).id ?? '');
  }
  return '';
};

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

  // Hydrate basic fields once the product arrives (edit mode only)
  useEffect(() => {
    const product = productResponse?.data;
    if (!product) return;
    form.reset({
      ...form.getValues(),
      name: product.name ?? '',
      brand: product.brand ?? '',
      description: product.description ?? '',
      categoryId: toId(product.categoryId),
      subcategoryId: toId(product.subcategoryId),
      status: product.status ?? 'draft',
    });
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
    updateBasicField,
    handleSubcategoryChange,
  };
};