import { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import type { UiProps } from '../ui-registry';

export interface MeasurementChartSpec {
  key: string;
  label: string;
  columns: string[];
}

export interface MeasurementItem {
  name: string;
  value: string | number;
  unit: string;
}

export interface SizeEntry {
  name: string;
  productMeasurements?: MeasurementItem[];
  bodyMeasurements?: MeasurementItem[];
}

interface UseSizeMeasurementsStateProps {
  field: UiProps['field'];
}

export function useSizeMeasurementsState({ field }: UseSizeMeasurementsStateProps) {
  const { setValue, getValues, formState } = useFormContext();
  const [unit, setUnit] = useState<'CM' | 'IN'>('CM');
  const dataSource = field.dataSource || {};

  const charts: MeasurementChartSpec[] = useMemo(() => {
    return Array.isArray(dataSource.charts)
      ? (dataSource.charts as MeasurementChartSpec[])
      : Array.isArray(field.dataSource)
        ? [
            {
              key: 'product',
              label: 'Product Measurements (Garment Flat)',
              columns: field.dataSource as string[],
            },
          ]
        : [];
  }, [dataSource.charts, field.dataSource]);

  const [activeTabKey, setActiveTabKey] = useState<string>(charts[0]?.key || 'product');

  const explicitSizeField =
    (dataSource.sizeField as string | undefined) ??
    (dataSource.variants as Array<{ key?: string; kind?: string }> | undefined)?.find(
      (v) => v.kind === 'size' || /size/i.test(v.key ?? ''),
    )?.key;

  const sizeFieldNames = useMemo(() => {
    const list = ['Size', 'size'];
    if (explicitSizeField && !list.includes(explicitSizeField)) {
      list.unshift(explicitSizeField);
    }
    return list;
  }, [explicitSizeField]);

  const watchedSizes = useWatch({ name: sizeFieldNames });

  const selectedSizes = useMemo(() => {
    if (!watchedSizes) return [];
    for (const val of watchedSizes) {
      if (Array.isArray(val) && val.length > 0) {
        return val.map(String);
      }
      if (typeof val === 'string' && val.trim()) {
        return val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }, [watchedSizes]);

  const hasErrorsForChartKey = (chartKey: string) => {
    const listKey = chartKey === 'body' ? 'bodyMeasurements' : 'productMeasurements';
    const sizesErr = formState.errors.sizes;
    if (!sizesErr) return false;
    if (Array.isArray(sizesErr)) {
      return sizesErr.some((sizeEntry) => {
        const list = sizeEntry?.[listKey];
        if (!list) return false;
        if (Array.isArray(list)) {
          return list.some((item: { value?: { message?: string }; message?: string } | undefined) =>
            Boolean(item?.value?.message || item?.message),
          );
        }
        if (typeof list === 'object') {
          return Object.values(list).some((item: unknown) => {
            const castItem = item as { value?: { message?: string }; message?: string } | undefined;
            return Boolean(castItem?.value?.message || castItem?.message);
          });
        }
        return false;
      });
    }
    return false;
  };

  const hasProductErrors = hasErrorsForChartKey('product');
  const hasBodyErrors = hasErrorsForChartKey('body');

  useEffect(() => {
    if (hasBodyErrors && !hasProductErrors && activeTabKey !== 'body') {
      setActiveTabKey('body');
    } else if (hasProductErrors && !hasBodyErrors && activeTabKey !== 'product') {
      setActiveTabKey('product');
    }
  }, [hasBodyErrors, hasProductErrors, activeTabKey]);

  useEffect(() => {
    if (charts.length === 0 || selectedSizes.length === 0) return;
    const currentSizes = (getValues('sizes') || []) as SizeEntry[];
    const prodChart = charts.find((c) => c.key === 'product') || charts[0];
    const bodyChart = charts.find((c) => c.key === 'body');
    const prodCols = prodChart?.columns || [];
    const bodyCols = bodyChart?.columns || [];

    const newSizesState: SizeEntry[] = selectedSizes.map((sizeName) => {
      const existing = currentSizes.find((s) => s.name === sizeName);
      if (existing) {
        const syncCols = (
          list: MeasurementItem[] | undefined,
          targetCols: string[],
        ): MeasurementItem[] => {
          const listArr = Array.isArray(list) ? list : [];
          return targetCols.map((col) => {
            const ext = listArr.find((m) => m.name === col);
            return ext || { name: col, value: '', unit: unit.toLowerCase() };
          });
        };
        return {
          ...existing,
          name: sizeName,
          productMeasurements: syncCols(existing.productMeasurements, prodCols),
          bodyMeasurements: syncCols(existing.bodyMeasurements, bodyCols),
        };
      }
      return {
        name: sizeName,
        productMeasurements: prodCols.map((c) => ({
          name: c,
          value: '',
          unit: unit.toLowerCase(),
        })),
        bodyMeasurements: bodyCols.map((c) => ({ name: c, value: '', unit: unit.toLowerCase() })),
      };
    });

    const isDifferent =
      JSON.stringify(currentSizes.map((s) => s.name)) !== JSON.stringify(selectedSizes) ||
      currentSizes.some((s) => {
        const pNames = (s.productMeasurements || []).map((m) => m.name);
        const bNames = (s.bodyMeasurements || []).map((m) => m.name);
        return (
          JSON.stringify(pNames) !== JSON.stringify(prodCols) ||
          JSON.stringify(bNames) !== JSON.stringify(bodyCols)
        );
      });

    if (isDifferent) {
      setValue('sizes', newSizesState, { shouldValidate: false });
    }
  }, [selectedSizes, charts, setValue, getValues, unit]);

  const handleUnitToggle = (nextUnit: 'CM' | 'IN') => {
    if (nextUnit === unit) return;
    setUnit(nextUnit);
    const currentSizes = (getValues('sizes') || []) as SizeEntry[];
    const updated = currentSizes.map((sizeObj) => {
      const updateUnit = (list: MeasurementItem[] | undefined): MeasurementItem[] =>
        (list || []).map((m) => ({ ...m, unit: nextUnit.toLowerCase() }));
      return {
        ...sizeObj,
        productMeasurements: updateUnit(sizeObj.productMeasurements),
        bodyMeasurements: updateUnit(sizeObj.bodyMeasurements),
      };
    });
    setValue('sizes', updated, { shouldValidate: true, shouldDirty: true });
  };

  return {
    unit,
    charts,
    activeTabKey,
    setActiveTabKey,
    selectedSizes,
    hasErrorsForChartKey,
    handleUnitToggle,
    formErrors: formState.errors,
  };
}
