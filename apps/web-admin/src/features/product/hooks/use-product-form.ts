import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { getProductById, PRODUCT_QUERY_KEYS } from '../api';
import type { ProductFormValues } from '../types';
import { hydrateProductForm, toCategoryPath } from '../utils/hydrate-product-form';

export type { ProductFormValues };

/**
 * How long a fetched product detail stays authoritative. The form is the
 * source of truth from the moment the seller types in it, so a routine refetch
 * (window focus, remount, list invalidation) must not mint a new product
 * identity underneath the form. Exported so a test can pin the window the same
 * way `VARIANT_AXES_STALE_TIME_MS` is pinned — see `sku-refetch-edits.spec.tsx`.
 */
export const PRODUCT_DETAIL_STALE_TIME_MS = 60 * 1000;

/**
 * NOTE: intentionally no `resolver` here. React Hook Form skips ALL
 * register/useController validation rules when a resolver is configured,
 * which silently hid every dynamic-field error (images, swatches, SKU
 * matrix...) at submit time. Field rules declared in the field components
 * are now the single source of truth for inline validation.
 *
 * WONTFIX: migrating to a zod resolver from `@celebs/shared-types` (AGENTS §3)
 * is explicitly out of scope for this change — it would re-introduce the hidden
 * dynamic-field errors above unless every field component is rewritten first.
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
    // Without a window the query is stale on every mount/refocus, so a
    // background refetch re-ran the hydration effect below for no reason.
    staleTime: PRODUCT_DETAIL_STALE_TIME_MS,
  });

  const categoryPath = useMemo(() => {
    const product = productResponse?.data;
    if (!product) return undefined;
    const cat = product.subcategory || product.category;
    const p = toCategoryPath(cat);
    return p.length > 0 ? p : undefined;
  }, [productResponse]);

  /**
   * React Hook Form recomputes `isDirty` only while the `formState` proxy has
   * `isDirty` ARMED, so it is read during render and not only inside the effect
   * below. Read lazily (effect-only) the flag can sit at a permanent `false` for
   * a form nothing subscribed to, and the guard would then never fire.
   */
  const isFormDirty = form.formState.isDirty;

  /**
   * Which product the form was last hydrated FROM. `null` = never hydrated, so
   * the first payload always wins and a route change to another product always
   * re-hydrates.
   */
  const hydratedProductIdRef = useRef<string | null>(null);

  // Hydrate all product fields once the product entity arrives (edit mode only)
  useEffect(() => {
    const product = productResponse?.data;
    if (!product) return;
    const productId = product.id;
    const isSameProduct = hydratedProductIdRef.current === productId;
    hydratedProductIdRef.current = productId;

    // A refetch of the SAME product must never replay `form.reset` over the
    // seller's unsaved work: every `shouldDirty` edit — a price typed seconds
    // ago, an uploaded photo, a renamed brand — is discarded by a reset, and the
    // seller is the only one who can reproduce it. Re-hydrating is still
    // correct whenever the product being edited actually changed, and whenever
    // there is nothing to lose.
    if (isSameProduct && isFormDirty) return;

    const hydrated = hydrateProductForm(product, form.getValues());
    form.reset(hydrated);
  }, [productResponse, form, isFormDirty]);

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

  /**
   * The category click is not a seller-authored edit of `subcategoryId` — it
   * mirrors the same click that already runs the category reset. Marking it
   * touched made the field look "worked on" before a single keystroke, which
   * is what turned one category selection into a wall of errors. `shouldDirty`
   * stays (the reset genuinely changes the form) and `shouldValidate` stays
   * scoped to this one field, so a genuinely empty subcategory still reports.
   */
  const handleSubcategoryChange = (subcategoryId: string) => {
    form.setValue('subcategoryId', subcategoryId, {
      shouldDirty: true,
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
