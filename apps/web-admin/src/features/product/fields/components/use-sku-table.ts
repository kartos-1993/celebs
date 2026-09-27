import React from 'react';
import { type Control, useFormContext, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

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
import { axiosClient } from '@/lib/axios/axios-client';

function resolveStoreCode(auth: {
  user?: { storeCode?: string; vendorProfile?: { storeCode?: string } };
}): string | undefined {
  return auth?.user?.vendorProfile?.storeCode || auth?.user?.storeCode;
}

function useVariantAxes(formControl: Control, dataSource?: VariantDataSource): VariantSelection[] {
  const staticVariants = dataSource?.variants;
  const staticVariantMeta = React.useMemo(
    () =>
      Array.isArray(staticVariants) ? staticVariants.map(normalizeVariantMetaItem) : undefined,
    [staticVariants],
  );

  const fetchUrl = typeof dataSource?.fetch === 'string' ? dataSource.fetch : undefined;
  const fetchParams = dataSource?.params;

  const { data: asyncVariantMeta } = useQuery<VariantMetaItem[]>({
    queryKey: ['sku-table-variants', fetchUrl, fetchParams],
    // No `??` cascade (AGENTS.md §8): a malformed envelope throws here and
    // surfaces as a query error instead of silently rendering no axes.
    queryFn: async () => {
      if (!fetchUrl) return [];
      const response = await axiosClient.get(fetchUrl, { params: fetchParams });
      return parseVariantAxesResponse(response.data).map((entry) =>
        normalizeVariantMetaItem(entry),
      );
    },
    enabled: !staticVariantMeta && !!fetchUrl,
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

  const handleAutoGenerateSkus = React.useCallback(
    () =>
      fillMissingSkuCodes({
        items: skuItems,
        read: getValues,
        write: (path, value) => setValue(path, value, { shouldDirty: true, shouldValidate: true }),
        brand: String(getValues('brand') ?? ''),
        productName: String(getValues('name') ?? ''),
        storeCode,
      }),
    [skuItems, setValue, getValues, storeCode],
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
