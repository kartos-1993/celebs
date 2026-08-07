import React from 'react';
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

export function SizeMeasurementsInputField({ field }: UiProps) {
  const columns: string[] = Array.isArray(field.dataSource) ? field.dataSource : [];
  const { register, setValue, getValues, watch, formState } = useFormContext();
  const [unit, setUnit] = React.useState<'CM' | 'IN'>('CM');
  const [activeTab, setActiveTab] = React.useState<'product' | 'body'>('product');

  const sizeFieldNames = ['Size', 'US Size', 'Waist Size'];
  const watchedSizes = useWatch({
    name: sizeFieldNames,
  });

  const activeSizesIndex = sizeFieldNames.findIndex(
    (_, idx) => watchedSizes?.[idx] && watchedSizes[idx].length > 0,
  );
  const selectedSizes =
    activeSizesIndex !== -1 ? (watchedSizes[activeSizesIndex] as string[]) : [];

  const sizesState = watch('sizes') || [];

  React.useEffect(() => {
    const currentSizes = getValues('sizes') || [];
    const newSizesState = selectedSizes.map((sizeName) => {
      const existing = currentSizes.find((s: any) => s.name === sizeName);
      if (existing) {
        const syncMeasurements = (list: any[]) => {
          const listArr = Array.isArray(list) ? list : [];
          return columns.map((col) => {
            const ext = listArr.find((m: any) => m.name === col);
            return ext || { name: col, value: '', unit: unit.toLowerCase() };
          });
        };
        return {
          ...existing,
          productMeasurements: syncMeasurements(existing.productMeasurements),
          bodyMeasurements: syncMeasurements(existing.bodyMeasurements),
        };
      }
      return {
        name: sizeName,
        productMeasurements: columns.map((c) => ({
          name: c,
          value: '',
          unit: unit.toLowerCase(),
        })),
        bodyMeasurements: columns.map((c) => ({
          name: c,
          value: '',
          unit: unit.toLowerCase(),
        })),
      };
    });

    const isDifferent =
      JSON.stringify(currentSizes.map((s: any) => s.name)) !==
        JSON.stringify(selectedSizes) ||
      currentSizes.some((s: any) => {
        const prodNames = (s.productMeasurements || []).map((m: any) => m.name);
        return JSON.stringify(prodNames) !== JSON.stringify(columns);
      });

    if (isDifferent) {
      setValue('sizes', newSizesState, { shouldValidate: false });
    }
  }, [selectedSizes, columns, setValue, getValues, unit]);

  const handleUnitToggle = (nextUnit: 'CM' | 'IN') => {
    if (nextUnit === unit) return;
    setUnit(nextUnit);

    const currentSizes = getValues('sizes') || [];
    const updated = currentSizes.map((sizeObj: any) => {
      const convert = (list: any[]) => {
        return (list || []).map((m: any) => {
          if (!m.value) return { ...m, unit: nextUnit.toLowerCase() };
          const numeric = parseFloat(m.value);
          if (isNaN(numeric)) return { ...m, unit: nextUnit.toLowerCase() };

          let convertedVal = m.value;
          if (nextUnit === 'IN') {
            convertedVal = String(Math.round((numeric / 2.54) * 10) / 10);
          } else {
            convertedVal = String(Math.round(numeric * 2.54 * 10) / 10);
          }
          return {
            ...m,
            value: convertedVal,
            unit: nextUnit.toLowerCase(),
          };
        });
      };

      return {
        ...sizeObj,
        productMeasurements: convert(sizeObj.productMeasurements),
        bodyMeasurements: convert(sizeObj.bodyMeasurements),
      };
    });

    setValue('sizes', updated, { shouldValidate: true, shouldDirty: true });
  };

  if (selectedSizes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Select product sizes in the "Price, Stock & Variants" section to enter measurements.
      </div>
    );
  }

  const renderTable = (listKey: 'productMeasurements' | 'bodyMeasurements') => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Size</TableHead>
            {columns.map((c) => (
              <TableHead key={c}>
                {c} ({unit.toLowerCase()})
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedSizes.map((sizeName, sizeIndex) => {
            const sizeObj = sizesState.find((s: any) => s.name === sizeName);

            return (
              <TableRow key={sizeName}>
                <TableCell className="font-semibold">
                  {sizeName}
                  {/* Keep size name registered */}
                  <input
                    type="hidden"
                    value={sizeName}
                    {...register(`sizes.${sizeIndex}.name` as const)}
                  />
                </TableCell>
                {columns.map((c) => {
                  const colIndex = sizeObj
                    ? (sizeObj[listKey] || []).findIndex((m: any) => m.name === c)
                    : -1;
                  const cellError =
                    colIndex !== -1
                      ? (formState.errors.sizes as any)?.[sizeIndex]?.[listKey]?.[colIndex]?.value?.message
                      : undefined;

                  return (
                    <TableCell key={c}>
                      <div className="space-y-1 py-1">
                        {/* Register name and unit hidden inputs so they are not stripped by shouldUnregister */}
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
                          type="number"
                          step="0.1"
                          min="0"
                          className={`h-8 w-28 bg-transparent ${cellError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="0"
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.value` as const)}
                        />
                        {cellError && (
                          <span className="text-[10px] text-red-500 block leading-tight font-medium">
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeTab === 'product' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('product')}
          >
            Product Chart
          </Button>
          <Button
            type="button"
            variant={activeTab === 'body' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('body')}
          >
            Body Chart
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Switch to:</span>
          <div className="inline-flex rounded-md bg-muted p-1">
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                unit === 'CM' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleUnitToggle('CM')}
            >
              CM
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded-sm transition-all ${
                unit === 'IN' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleUnitToggle('IN')}
            >
              IN
            </button>
          </div>
        </div>
      </div>

      {/* Mount both tables simultaneously and toggle using hidden CSS class */}
      <div className={`rounded-md border overflow-x-auto ${activeTab === 'product' ? '' : 'hidden'}`}>
        {renderTable('productMeasurements')}
      </div>
      <div className={`rounded-md border overflow-x-auto ${activeTab === 'body' ? '' : 'hidden'}`}>
        {renderTable('bodyMeasurements')}
      </div>

      <p className="text-xs text-muted-foreground italic">
        *Measurements entered here will be saved and displayed to customers on the product detail page.
      </p>
    </div>
  );
}
