import React from 'react';
import { type Control, useFormContext, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { getVariantAxes, PRODUCT_QUERY_KEYS } from '../../api';

import {
  collectApplyAssignments,
  countBlankSkuCodes,
  fillMissingSkuCodes,
  normalizeVariantMetaItem,
  parseVariantAxesResponse,
  toVariantSelection,
} from './apply-sku-scope';
import type {
  ApplyAllState,
  VariantDataSource,
  VariantMetaItem,
  VariantSelection,
} from './sku-table-types';
import {
  buildScopeOptions,
  collectSellerSkuItems,
  getSkuButtonState,
  isSkuFieldLocked,
} from './sku-table-utils';

import { AuthContext } from '@/context/auth-provider';

function resolveStoreCode(auth: {
  user?: { storeCode?: string; vendorProfile?: { storeCode?: string } };
}): string | undefined {
  return auth?.user?.vendorProfile?.storeCode || auth?.user?.storeCode;
}

/**
 * How long a fetched axis list stays authoritative. Matches the render-schema
 * query's own window: the axes only change when the category/product schema
 * does, and a fresh identity is what re-keys the matrix's watched SKU paths.
 */
export const VARIANT_AXES_STALE_TIME_MS = 2 * 60 * 1000;

function useVariantAxes(formControl: Control, dataSource?: VariantDataSource): VariantSelection[] {
  const staticVariants = dataSource?.variants;
  const staticVariantMeta = React.useMemo(
    () =>
      Array.isArray(staticVariants) ? staticVariants.map(normalizeVariantMetaItem) : undefined,
    [staticVariants],
  );

  const fetchPath = typeof dataSource?.fetch === 'string' ? dataSource.fetch : undefined;
  const params = dataSource?.params;

  const { data: asyncVariantMeta } = useQuery<VariantMetaItem[]>({
    queryKey: PRODUCT_QUERY_KEYS.variantAxes(fetchPath ?? '', params),
    // Envelope validation lives in `parseVariantAxesResponse` (AGENTS.md §8):
    // a malformed payload throws there and surfaces as a query error instead
    // of silently rendering no axes.
    queryFn: async () => {
      if (!fetchPath) return [];
      const payload = await getVariantAxes(fetchPath, params);
      return parseVariantAxesResponse(payload).map((entry) => normalizeVariantMetaItem(entry));
    },
    // The axes are schema-shaped metadata, not live form state, and they drive
    // `skuPaths` — the exact path list the matrix watches. A routine refetch
    // that mints a new `productResponse`/axes identity mid-edit therefore
    // re-resolves the watch list underneath the seller's hands. Holding the
    // cache for the same window `use-product-schema` uses keeps a background
    // refetch from rebuilding the grid while a cell is being typed into.
    staleTime: VARIANT_AXES_STALE_TIME_MS,
    enabled: !staticVariantMeta && !!fetchPath,
  });

  const variantMeta = staticVariantMeta ?? asyncVariantMeta ?? [];

  const watchedValues = useWatch({
    control: formControl,
    name: variantMeta.map((axis) => axis.key),
  }) as unknown[] | undefined;

  const variantSelections = variantMeta.map((axis, index) =>
    toVariantSelection(axis, watchedValues?.[index]),
  );

  return variantSelections.filter((axis) => axis.values.length > 0);
}

export function useSkuTable(dataSource?: VariantDataSource) {
  const { control: formControl, setValue, getValues, formState } = useFormContext();
  const auth = React.useContext(AuthContext);
  const storeCode = resolveStoreCode(auth);

  const labelsMap = React.useMemo(
    () => (dataSource?.labels ?? {}) as Record<string, Record<string, string>>,
    [dataSource?.labels],
  );

  const labelOf = React.useCallback(
    (axisKey: string, value: string) => labelsMap?.[axisKey]?.[String(value)] ?? String(value),
    [labelsMap],
  );

  const variants = useVariantAxes(formControl, dataSource);

  const [applyAll, setApplyAll] = React.useState<ApplyAllState>({});
  const [applyScope, setApplyScope] = React.useState<string>('ALL');

  const scopeOptions = React.useMemo(
    () => buildScopeOptions(variants, labelOf),
    [variants, labelOf],
  );

  const applyToAll = React.useCallback(() => {
    for (const assignment of collectApplyAssignments(variants, applyScope, applyAll)) {
      setValue(assignment.path, assignment.value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [variants, applyScope, applyAll, setValue]);

  const skuItems = React.useMemo(() => collectSellerSkuItems(variants), [variants]);
  const skuPaths = React.useMemo(() => skuItems.map((item) => item.path), [skuItems]);

  const watchedSkus = useWatch({
    control: formControl,
    name: skuPaths,
  }) as Array<string | undefined> | undefined;

  const readSkuCode = React.useCallback(
    (path: string, index: number) => watchedSkus?.[index] ?? getValues(path) ?? '',
    [watchedSkus, getValues],
  );

  const skuButtonState = React.useMemo(
    () => getSkuButtonState(skuPaths.length, countBlankSkuCodes(skuPaths, readSkuCode)),
    [skuPaths, readSkuCode],
  );

  const isSkuLocked = React.useCallback(
    (path: string) =>
      isSkuFieldLocked(
        getValues('status') as string | undefined,
        formState.defaultValues as Record<string, unknown> | undefined,
        path,
      ),
    [getValues, formState.defaultValues],
  );

  const handleAutoGenerateSkus = React.useCallback(
    () =>
      fillMissingSkuCodes({
        items: skuItems,
        // The SAME reader the button's count uses. `getValues(path)` alone
        // cannot see a cell the matrix holds under a legacy flat dot-key, so
        // every code read as blank and the action rewrote rows the seller had
        // already named.
        read: readSkuCode,
        write: (path, value) => setValue(path, value, { shouldDirty: true, shouldValidate: true }),
        // A published product's existing warehouse barcodes are `readOnly` in
        // the matrix; generating into one is an overwrite the seller cannot see.
        canWrite: (item) => !isSkuLocked(item.path),
        brand: String(getValues('brand') ?? ''),
        productName: String(getValues('name') ?? ''),
        storeCode,
      }),
    [skuItems, readSkuCode, setValue, isSkuLocked, getValues, storeCode],
  );

  return {
    variants,
    labelOf,
    applyAll,
    setApplyAll,
    applyScope,
    setApplyScope,
    scopeOptions,
    applyToAll,
    handleAutoGenerateSkus,
    skuButtonState,
    isSkuLocked,
  };
}
