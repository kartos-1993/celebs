import React from 'react';
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
import type { UiProps } from '../ui-registry';

const TOP_BODY_COLUMNS = ['Height', 'Bust', 'Waist Size', 'Hip Size'];
const BOTTOM_BODY_COLUMNS = ['Height', 'Waist Size', 'Hip Size'];

export function SizeMeasurementsInputField({ field }: UiProps) {
  const prodColumns: string[] = Array.isArray(field.dataSource) ? field.dataSource : [];

  // If no size chart columns are configured for this category, do not render at all
  if (prodColumns.length === 0) {
    return null;
  }

  const isBottomCategory = prodColumns.some((c) =>
    ['Waist', 'Inseam', 'Thigh', 'Leg Opening', 'Rise'].includes(c),
  );

  const bodyColumns = isBottomCategory ? BOTTOM_BODY_COLUMNS : TOP_BODY_COLUMNS;

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
        const syncProduct = (list: any[]) => {
          const listArr = Array.isArray(list) ? list : [];
          return prodColumns.map((col) => {
            const ext = listArr.find((m: any) => m.name === col);
            return ext || { name: col, value: '', unit: unit.toLowerCase() };
          });
        };

        const syncBody = (list: any[]) => {
          const listArr = Array.isArray(list) ? list : [];
          return bodyColumns.map((col) => {
            const ext = listArr.find((m: any) => m.name === col);
            return ext || { name: col, value: '', unit: unit.toLowerCase() };
          });
        };

        return {
          ...existing,
          productMeasurements: syncProduct(existing.productMeasurements),
          bodyMeasurements: syncBody(existing.bodyMeasurements),
        };
      }

      return {
        name: sizeName,
        productMeasurements: prodColumns.map((c) => ({
          name: c,
          value: '',
          unit: unit.toLowerCase(),
        })),
        bodyMeasurements: bodyColumns.map((c) => ({
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
        const pNames = (s.productMeasurements || []).map((m: any) => m.name);
        const bNames = (s.bodyMeasurements || []).map((m: any) => m.name);
        return (
          JSON.stringify(pNames) !== JSON.stringify(prodColumns) ||
          JSON.stringify(bNames) !== JSON.stringify(bodyColumns)
        );
      });

    if (isDifferent) {
      setValue('sizes', newSizesState, { shouldValidate: false });
    }
  }, [selectedSizes, prodColumns, bodyColumns, setValue, getValues, unit]);

  const handleUnitToggle = (nextUnit: 'CM' | 'IN') => {
    if (nextUnit === unit) return;
    setUnit(nextUnit);

    const currentSizes = getValues('sizes') || [];
    const updated = currentSizes.map((sizeObj: any) => {
      const updateUnit = (list: any[]) => {
        return (list || []).map((m: any) => ({
          ...m,
          unit: nextUnit.toLowerCase(),
        }));
      };

      return {
        ...sizeObj,
        productMeasurements: updateUnit(sizeObj.productMeasurements),
        bodyMeasurements: updateUnit(sizeObj.bodyMeasurements),
      };
    });

    setValue('sizes', updated, { shouldValidate: true, shouldDirty: true });
  };

  if (selectedSizes.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        Select product sizes in the section above to enter size chart measurements.
      </div>
    );
  }

  const renderTable = (listKey: 'productMeasurements' | 'bodyMeasurements') => {
    const cols = listKey === 'productMeasurements' ? prodColumns : bodyColumns;
    const isBody = listKey === 'bodyMeasurements';

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-24 font-bold text-foreground">Size</TableHead>
            {cols.map((c) => (
              <TableHead key={c} className="font-semibold text-foreground">
                {c} <span className="text-xs text-muted-foreground font-normal">({unit.toLowerCase()})</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedSizes.map((sizeName, sizeIndex) => {
            const sizeObj = sizesState.find((s: any) => s.name === sizeName);

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
                {cols.map((c) => {
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
                          className={`h-8 w-32 font-mono text-xs bg-background ${cellError ? 'border-destructive ring-1 ring-destructive' : ''}`}
                          placeholder={isBody ? 'e.g. 170-175 or 92-96' : 'e.g. 56 or 120'}
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.value` as const)}
                        />
                        {cellError && (
                          <span className="text-[10px] text-destructive block leading-tight font-medium">
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
    <div className="mt-4 space-y-3 rounded-lg border p-4 bg-card text-card-foreground shadow-2xs col-span-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'product'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('product')}
          >
            Product Measurements (Garment Flat)
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'body'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('body')}
          >
            Body Measurements (Wearer Fit Guide)
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Unit:</span>
          <div className="inline-flex rounded-md bg-muted p-0.5 border">
            <button
              type="button"
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-sm transition-all ${
                unit === 'CM' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleUnitToggle('CM')}
            >
              CM
            </button>
            <button
              type="button"
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-sm transition-all ${
                unit === 'IN' ? 'bg-background text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => handleUnitToggle('IN')}
            >
              IN
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-md border overflow-x-auto ${activeTab === 'product' ? '' : 'hidden'}`}>
        {renderTable('productMeasurements')}
      </div>
      <div className={`rounded-md border overflow-x-auto ${activeTab === 'body' ? '' : 'hidden'}`}>
        {renderTable('bodyMeasurements')}
      </div>

      <p className="text-[11px] text-muted-foreground italic pt-1">
        *Measurements entered here will be saved and displayed to customers on the product detail page size guide.
      </p>
    </div>
  );
}
