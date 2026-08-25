import React, { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { UiProps } from '../ui-registry';

import { cn } from '@/lib/utils';

interface MeasurementChartSpec {
  key: string;
  label: string;
  columns: string[];
}

interface MeasurementItem {
  name: string;
  value: string | number;
  unit: string;
}

interface SizeEntry {
  name: string;
  productMeasurements?: MeasurementItem[];
  bodyMeasurements?: MeasurementItem[];
}

export function SizeMeasurementsInputField({ field }: UiProps) {
  const { register, setValue, getValues, formState } = useFormContext();
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

  // Dynamically resolve the size field name from schema dataSource / variant metadata
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

  // Fast targeted subscription: ONLY re-render when the size variant changes
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

  // Synchronize sizes schema structure only when selectedSizes or charts change
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

  if (charts.length === 0) {
    return null;
  }

  if (selectedSizes.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground col-span-full">
        Select product sizes in the section above to enter size chart measurements.
      </div>
    );
  }

  const renderTableForChart = (chart: MeasurementChartSpec) => {
    const listKey: 'bodyMeasurements' | 'productMeasurements' =
      chart.key === 'body' ? 'bodyMeasurements' : 'productMeasurements';

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-24">Size</TableHead>
            {chart.columns.map((c) => (
              <TableHead key={c}>
                {c}{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  ({unit.toLowerCase()})
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedSizes.map((sizeName, sizeIndex) => {
            return (
              <TableRow key={sizeName}>
                <TableCell className="font-bold text-foreground">
                  {sizeName}
                  <input
                    type="hidden"
                    value={sizeName}
                    {...register(`sizes.${sizeIndex}.name` as const)}
                  />
                </TableCell>
                {chart.columns.map((c, colIndex) => {
                  const sizesErrors = formState.errors.sizes as
                    | Record<string, Record<string, Array<{ value?: { message?: string } }>>>
                    | undefined;
                  const cellError = sizesErrors?.[sizeIndex]?.[listKey]?.[colIndex]?.value?.message;

                  return (
                    <TableCell key={c}>
                      <div className="space-y-1 py-1">
                        <input
                          type="hidden"
                          value={c}
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.name` as const)}
                        />
                        <input
                          type="hidden"
                          value={unit.toLowerCase()}
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.unit` as const)}
                        />
                        <Input
                          type="text"
                          data-testid={`measurement-input-${sizeName}-${c}`}
                          placeholder={
                            listKey === 'bodyMeasurements' ? 'e.g. 70 or 70-80' : 'e.g. 70'
                          }
                          className={cn(
                            'h-8 text-xs',
                            cellError && 'border-destructive focus-visible:ring-destructive',
                          )}
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.value` as const)}
                        />
                        {cellError && (
                          <span className="text-xs text-destructive block font-medium">
                            {cellError}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="col-span-full space-y-4 rounded-xl border bg-card p-4 shadow-2xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div>
          <h4 className="text-sm font-medium text-foreground">Size Chart & Measurements</h4>
          <p className="text-xs text-muted-foreground">
            Provide measurements for each active size to help buyers choose the right fit.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 self-start sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="measurement-unit-cm"
            onClick={() => handleUnitToggle('CM')}
            className={cn(
              'h-auto rounded-md px-2.5 py-1 text-xs font-semibold',
              unit === 'CM'
                ? 'bg-background text-foreground shadow-2xs hover:bg-background hover:text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            CM
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="measurement-unit-in"
            onClick={() => handleUnitToggle('IN')}
            className={cn(
              'h-auto rounded-md px-2.5 py-1 text-xs font-semibold',
              unit === 'IN'
                ? 'bg-background text-foreground shadow-2xs hover:bg-background hover:text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            IN
          </Button>
        </div>
      </div>

      {/* Tabs for Multiple Charts */}
      {charts.length > 1 && (
        <div className="flex gap-2 border-b">
          {charts.map((chart) => {
            const hasError = hasErrorsForChartKey(chart.key);
            const isActive = activeTabKey === chart.key;
            return (
              <Button
                key={chart.key}
                type="button"
                variant="ghost"
                size="sm"
                data-testid={`measurement-tab-${chart.key}`}
                onClick={() => setActiveTabKey(chart.key)}
                className={cn(
                  'h-auto -mb-px gap-1.5 rounded-none border-b-2 px-3 py-2 text-xs font-medium',
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                  hasError && 'text-destructive',
                )}
              >
                {chart.label}
                {hasError && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
              </Button>
            );
          })}
        </div>
      )}

      {/* Render Active Chart Table */}
      {charts
        .filter((c) => c.key === activeTabKey)
        .map((chart) => (
          <div key={chart.key} className="space-y-2">
            <div className="rounded-lg border overflow-hidden">{renderTableForChart(chart)}</div>
          </div>
        ))}
    </div>
  );
}
