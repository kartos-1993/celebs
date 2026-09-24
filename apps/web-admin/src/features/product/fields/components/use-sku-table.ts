import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { generateCollisionProofBaseSku } from '../../utils/generate-sku-helpers';

import type {
  ApplyAllState,
  VariantDataSource,
  VariantMetaItem,
  VariantSelection,
} from './sku-table-types';
import {
  buildScopeOptions,
  collectSkuPaths,
  getSkuButtonState,
  matchesScope,
  pathFor,
} from './sku-table-utils';

import { axiosClient } from '@/lib/axios/axios-client';

export function useSkuTable(dataSource?: VariantDataSource) {
  const { control: formControl, setValue, getValues } = useFormContext();

  const labelsMap = React.useMemo(
    () => (dataSource?.labels ?? {}) as Record<string, Record<string, string>>,
    [dataSource?.labels],
  );

  const labelOf = React.useCallback(
    (axisKey: string, value: string) => labelsMap?.[axisKey]?.[String(value)] ?? String(value),
    [labelsMap],
  );

  const staticVariantMeta = React.useMemo<VariantMetaItem[] | undefined>(() => {
    if (Array.isArray(dataSource?.variants)) {
      return dataSource.variants.map((a) => ({
        key: a.key ?? a.name ?? a.value ?? '',
        label: a.label ?? a.name ?? a.key ?? String(a.value ?? ''),
      }));
    }
    return undefined;
  }, [dataSource?.variants]);

  const fetchUrl = typeof dataSource?.fetch === 'string' ? dataSource.fetch : undefined;

  const { data: asyncVariantMeta } = useQuery({
    queryKey: ['sku-table-variants', fetchUrl, dataSource?.params],
    queryFn: async () => {
      if (!fetchUrl) return [];
      const res = await axiosClient.get(fetchUrl, { params: dataSource?.params });
      const data = res.data;
      const raw =
        data?.data?.variants ??
        data?.variants ??
        data?.data?.axes ??
        data?.axes ??
        data?.data ??
        data;
      const list = Array.isArray(raw) ? raw : [];
      return list.map((a: Record<string, unknown>) => ({
        key: String(a.key ?? a.name ?? a.value ?? ''),
        label: String(a.label ?? a.name ?? a.key ?? a.value ?? ''),
      }));
    },
    enabled: !staticVariantMeta && !!fetchUrl,
  });

  const variantMeta = staticVariantMeta ?? asyncVariantMeta ?? [];

  const watchedValues = useWatch({
    control: formControl,
    name: variantMeta.map((a) => a.key),
  }) as unknown[] | undefined;

  const variantSelections: VariantSelection[] = variantMeta.map((a, idx) => {
    const v = watchedValues?.[idx];
    if (Array.isArray(v)) {
      const arr = v.map((x) => {
        if (typeof x === 'string') return x;
        if (typeof x === 'object' && x !== null) {
          const obj = x as Record<string, unknown>;
          return String(obj.value ?? obj.label ?? x);
        }
        return String(x);
      });
      return { key: a.key, label: a.label, values: arr };
    }
    if (typeof v === 'string' && v) {
      const parts = v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return { key: a.key, label: a.label, values: parts.length ? parts : [v] };
    }
    return { key: a.key, label: a.label, values: [] as string[] };
  });

  const variants = variantSelections.filter((a) => a.values.length > 0);

  const [applyAll, setApplyAll] = React.useState<ApplyAllState>({});
  const [applyScope, setApplyScope] = React.useState<string>('ALL');

  const scopeOptions = React.useMemo(
    () => buildScopeOptions(variants, labelOf),
    [variants, labelOf],
  );

  const applyToAll = React.useCallback(() => {
    if (variants.length === 0) return;
    const fill = (name: string, value: unknown) =>
      setValue(name, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

    if (variants.length === 1) {
      for (const opt of variants[0].values) {
        if (!matchesScope(applyScope, variants[0].key, opt)) continue;
        if (applyAll.price != null) fill(pathFor(variants[0].key, opt, 'price'), applyAll.price);
        if (applyAll.specialPrice != null)
          fill(pathFor(variants[0].key, opt, 'specialPrice'), applyAll.specialPrice);
        if (applyAll.stock != null) fill(pathFor(variants[0].key, opt, 'stock'), applyAll.stock);
        if (applyAll.sellerSku != null)
          fill(pathFor(variants[0].key, opt, 'sellerSku'), applyAll.sellerSku);
        if (applyAll.freeItems != null)
          fill(pathFor(variants[0].key, opt, 'freeItems'), applyAll.freeItems);
        if (applyAll.available != null)
          fill(pathFor(variants[0].key, opt, 'available'), applyAll.available);
      }
    } else if (variants.length >= 2) {
      for (const opt1 of variants[0].values) {
        for (const opt2 of variants[1].values) {
          if (!matchesScope(applyScope, variants[0].key, opt1, variants[1].key, opt2)) continue;
          if (applyAll.price != null)
            fill(pathFor(variants[0].key, opt1, variants[1].key, opt2, 'price'), applyAll.price);
          if (applyAll.specialPrice != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'specialPrice'),
              applyAll.specialPrice,
            );
          if (applyAll.stock != null)
            fill(pathFor(variants[0].key, opt1, variants[1].key, opt2, 'stock'), applyAll.stock);
          if (applyAll.sellerSku != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'sellerSku'),
              applyAll.sellerSku,
            );
          if (applyAll.freeItems != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'freeItems'),
              applyAll.freeItems,
            );
          if (applyAll.available != null)
            fill(
              pathFor(variants[0].key, opt1, variants[1].key, opt2, 'available'),
              applyAll.available,
            );
        }
      }
    }
  }, [variants, applyScope, applyAll, setValue]);

  const skuPaths = React.useMemo(() => collectSkuPaths(variants), [variants]);

  const watchedSkus = useWatch({
    control: formControl,
    name: skuPaths,
  }) as Array<string | undefined> | undefined;

  const skuButtonState = React.useMemo(() => {
    const total = skuPaths.length;
    let missing = 0;
    skuPaths.forEach((path, i) => {
      const val = (watchedSkus?.[i] ?? getValues(path) ?? '') as string;
      if (!String(val).trim()) {
        missing += 1;
      }
    });
    return getSkuButtonState(total, missing);
  }, [skuPaths, watchedSkus, getValues]);

  const handleAutoGenerateSkus = React.useCallback(() => {
    const fillIfBlank = (name: string) => {
      const existing = String(getValues(name) || '').trim();
      if (!existing) {
        setValue(name, generateCollisionProofBaseSku(brand, departmentHint), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    };

    const departmentHint = String(getValues('categoryPath') || getValues('categoryId') || '');
    const brand = getValues('brand');

    for (const path of skuPaths) {
      fillIfBlank(path);
    }
  }, [skuPaths, setValue, getValues]);

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
  };
}
