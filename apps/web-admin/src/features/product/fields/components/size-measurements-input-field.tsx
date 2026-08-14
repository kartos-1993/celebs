import React, { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';
import { cn } from '@/lib/utils';
import type { UiProps } from '../ui-registry';

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
  const { register, setValue, getValues, watch, formState } = useFormContext();
  const [unit, setUnit] = React.useState<'CM' | 'IN'>('CM');
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

  const [activeTabKey, setActiveTabKey] = React.useState<string>(charts[0]?.key || 'product');

  const sizeFieldNames = ['Size', 'size', 'US Size', 'Waist Size', 'Alpha Size', 'Standard Size'];
  const allValues = watch();

  const selectedSizes = useMemo(() => {
    // 1. First check known size field names
    for (const name of sizeFieldNames) {
      const val = allValues[name];
      if (Array.isArray(val) && val.length > 0) {
        return val.map(String);
      }
    }
    // 2. Check any dynamic field key matching 'size'
    const otherSizeKeys = Object.keys(allValues).filter(
      (k) => k.toLowerCase().includes('size') && k !== 'sizes' && !k.startsWith('sizes.'),
    );
    for (const key of otherSizeKeys) {
      const val = allValues[key];
      if (Array.isArray(val) && val.length > 0) {
        return val.map(String);
      }
    }
    return [];
  }, [allValues]);

  const sizesState = (watch('sizes') || []) as SizeEntry[];

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
    if (typeof sizesErr === 'object') {
      return Object.values(sizesErr).some((sizeEntry: unknown) => {
        const castEntry = sizeEntry as Record<string, unknown> | undefined;
        const list = castEntry?.[listKey];
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

  React.useEffect(() => {
    if (hasBodyErrors && !hasProductErrors && activeTabKey !== 'body') {
      setActiveTabKey('body');
    } else if (hasProductErrors && !hasBodyErrors && activeTabKey !== 'product') {
      setActiveTabKey('product');
    }
  }, [hasBodyErrors, hasProductErrors, activeTabKey]);

  React.useEffect(() => {
    if (charts.length === 0) return;
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
            <TableHead className="w-24 font-bold text-foreground">Size</TableHead>
            {chart.columns.map((c) => (
              <TableHead key={c} className="font-semibold text-foreground">
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
            const sizeObj = sizesState.find((s) => s.name === sizeName);
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
                {chart.columns.map((c) => {
                  const items = sizeObj ? sizeObj[listKey] || [] : [];
                  const colIndex = items.findIndex((m) => m.name === c);

                  // ── FIX: before the sync effect runs, colIndex is -1.
                  // Registering `sizes.x.<list>.-1.value` corrupts RHF state,
                  // so render a placeholder until the row is synced.
                  if (colIndex === -1) {
                    return (
                      <TableCell key={c}>
                        <div className="py-1 text-xs text-muted-foreground italic">Syncing…</div>
                      </TableCell>
                    );
                  }

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
                          placeholder={listKey === 'bodyMeasurements' ? 'e.g. 70 or 70-80' : 'e.g. 70'}
                          className={cn(
                            'h-8 text-xs',
                            cellError && 'border-destructive focus-visible:ring-destructive',
                          )}
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.value` as const)}
                        />
                        {cellError && (
                          <span className="text-[10px] text-destructive block font-medium">
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
          <h4 className="text-sm font-bold text-foreground">Size Chart & Measurements</h4>
          <p className="text-xs text-muted-foreground">
            Provide measurements for each active size to help buyers choose the right fit.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleUnitToggle('CM')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              unit === 'CM'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            CM
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle('IN')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              unit === 'IN'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inches (IN)
          </button>
        </div>
      </div>

      {charts.length > 1 ? (
        <div className="space-y-3">
          <div className="flex border-b">
            {charts.map((c) => {
              const hasTabErrors = c.key === 'body' ? hasBodyErrors : hasProductErrors;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setActiveTabKey(c.key)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
                    (activeTabKey || charts[0].key) === c.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{c.label}</span>
                  {hasTabErrors && (
                    <span className="inline-block w-2 h-2 rounded-full bg-destructive shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          <div>
            {charts.map((c) =>
              (activeTabKey || charts[0].key) === c.key ? (
                <div key={c.key}>{renderTableForChart(c)}</div>
              ) : null,
            )}
          </div>
        </div>
      ) : (
        <div>{renderTableForChart(charts[0])}</div>
      )}
    </div>
  );
}
