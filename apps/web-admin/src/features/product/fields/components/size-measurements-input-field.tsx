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
import { Info, Sparkles, Shirt, UserCheck, HelpCircle } from 'lucide-react';
import type { UiProps } from '../ui-registry';

const STANDARD_TOP_BODY_COLS = ['Height', 'Bust', 'Waist Size', 'Hip Size'];
const STANDARD_BOTTOM_BODY_COLS = ['Height', 'Waist Size', 'Hip Size'];

export function SizeMeasurementsInputField({ field }: UiProps) {
  const prodColumns: string[] = Array.isArray(field.dataSource) && field.dataSource.length > 0
    ? field.dataSource
    : ['Shoulder', 'Chest', 'Length', 'Sleeve Length'];

  const isBottomCategory = prodColumns.some((c) =>
    ['Waist', 'Inseam', 'Thigh', 'Leg Opening', 'Rise'].includes(c)
  );

  const bodyColumns = isBottomCategory ? STANDARD_BOTTOM_BODY_COLS : STANDARD_TOP_BODY_COLS;

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
      const convert = (list: any[]) => {
        return (list || []).map((m: any) => {
          if (!m.value) return { ...m, unit: nextUnit.toLowerCase() };
          return {
            ...m,
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

  const handleAutofillBodyRanges = () => {
    const currentSizes = getValues('sizes') || [];
    const isCm = unit === 'CM';

    const updated = currentSizes.map((sizeObj: any) => {
      const nameUpper = String(sizeObj.name || '').toUpperCase();
      let hVal = isCm ? '165-170' : '65.0-66.9';
      let bVal = isCm ? '88-92' : '34.6-36.2';
      let wVal = isCm ? '72-76' : '28.3-29.9';
      let hipVal = isCm ? '90-94' : '35.4-37.0';

      if (nameUpper.includes('XS')) {
        hVal = isCm ? '160-165' : '63.0-65.0';
        bVal = isCm ? '82-86' : '32.3-33.9';
        wVal = isCm ? '66-70' : '26.0-27.6';
        hipVal = isCm ? '84-88' : '33.1-34.6';
      } else if (nameUpper.includes('S')) {
        hVal = isCm ? '165-170' : '65.0-66.9';
        bVal = isCm ? '86-90' : '33.9-35.4';
        wVal = isCm ? '70-74' : '27.6-29.1';
        hipVal = isCm ? '88-92' : '34.6-36.2';
      } else if (nameUpper.includes('M')) {
        hVal = isCm ? '170-175' : '66.9-68.9';
        bVal = isCm ? '90-94' : '35.4-37.0';
        wVal = isCm ? '74-78' : '29.1-30.7';
        hipVal = isCm ? '92-96' : '36.2-37.8';
      } else if (nameUpper.includes('L')) {
        hVal = isCm ? '175-180' : '68.9-70.9';
        bVal = isCm ? '94-98' : '37.0-38.6';
        wVal = isCm ? '78-82' : '30.7-32.3';
        hipVal = isCm ? '96-100' : '37.8-39.4';
      } else if (nameUpper.includes('XL')) {
        hVal = isCm ? '180-185' : '70.9-72.8';
        bVal = isCm ? '98-104' : '38.6-40.9';
        wVal = isCm ? '82-88' : '32.3-34.6';
        hipVal = isCm ? '100-106' : '39.4-41.7';
      }

      const newBodyList = bodyColumns.map((colName) => {
        let val = '';
        if (colName === 'Height') val = hVal;
        else if (colName === 'Bust') val = bVal;
        else if (colName === 'Waist Size') val = wVal;
        else if (colName === 'Hip Size') val = hipVal;
        return { name: colName, value: val, unit: unit.toLowerCase() };
      });

      return {
        ...sizeObj,
        bodyMeasurements: newBodyList,
      };
    });

    setValue('sizes', updated, { shouldValidate: true, shouldDirty: true });
  };

  if (selectedSizes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        <HelpCircle className="w-8 h-8 text-indigo-500 mx-auto opacity-70" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No Variants Selected Yet
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Please select product sizes (e.g. S, M, L) in the <span className="font-semibold text-slate-700 dark:text-slate-300">"Price, Stock & Variants"</span> section above to enable the Size Chart generator.
        </p>
      </div>
    );
  }

  const renderTable = (listKey: 'productMeasurements' | 'bodyMeasurements') => {
    const cols = listKey === 'productMeasurements' ? prodColumns : bodyColumns;
    const isBody = listKey === 'bodyMeasurements';

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-900/60">
            <TableHead className="w-24 font-bold text-slate-900 dark:text-slate-100">Size</TableHead>
            {cols.map((c) => (
              <TableHead key={c} className="font-semibold text-slate-700 dark:text-slate-300">
                {c} <span className="text-xs text-slate-400 font-normal">({unit.toLowerCase()})</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedSizes.map((sizeName, sizeIndex) => {
            const sizeObj = sizesState.find((s: any) => s.name === sizeName);

            return (
              <TableRow key={sizeName} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-bold text-slate-900 dark:text-slate-100">
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
                          className={`h-8 w-32 font-mono text-xs bg-white dark:bg-slate-950 ${cellError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800'}`}
                          placeholder={isBody ? 'e.g. 165-170 or 34-36' : 'e.g. 48'}
                          {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.value` as const)}
                        />
                        {cellError && (
                          <span className="text-[10px] text-rose-500 block leading-tight font-medium">
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
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950 shadow-2xs">
      {/* Educational Banner for Vendors */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-purple-50/50 dark:from-indigo-950/30 dark:via-blue-950/20 dark:to-purple-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-semibold">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Product Size Guide & Customer Measurement Assistant</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
          Providing both <strong className="text-slate-800 dark:text-slate-200">Garment Dimensions</strong> and <strong className="text-slate-800 dark:text-slate-200">Body Fit Ranges</strong> reduces returns by up to 40%!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-1">
          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
            <Shirt className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Product Chart (Garment)</span>
              <span className="text-[11px] text-slate-500">Dimensions of clothing item laid flat (e.g. Chest 52cm).</span>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Body Chart (Wearer)</span>
              <span className="text-[11px] text-slate-500">Human body ranges suited for fit (e.g. Bust 88-92cm).</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Controls & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeTab === 'product' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('product')}
            className={`gap-1.5 text-xs font-semibold ${activeTab === 'product' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
          >
            <Shirt className="w-3.5 h-3.5" /> Product Chart (Garment)
          </Button>
          <Button
            type="button"
            variant={activeTab === 'body' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('body')}
            className={`gap-1.5 text-xs font-semibold ${activeTab === 'body' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Body Chart (Human Body)
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'body' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutofillBodyRanges}
              className="text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
              title="Automatically fill standard body ranges based on selected sizes"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Pre-fill Standard Ranges
            </Button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Unit:</span>
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                  unit === 'CM' ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => handleUnitToggle('CM')}
              >
                CM
              </button>
              <button
                type="button"
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                  unit === 'IN' ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => handleUnitToggle('IN')}
              >
                IN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Renderers */}
      <div className={`rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto ${activeTab === 'product' ? '' : 'hidden'}`}>
        {renderTable('productMeasurements')}
      </div>
      <div className={`rounded-lg border border-purple-200 dark:border-purple-900/50 overflow-x-auto ${activeTab === 'body' ? '' : 'hidden'}`}>
        {renderTable('bodyMeasurements')}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <p className="italic">
          *Measurements entered here will be saved and displayed to customers on the storefront Size Guide modal.
        </p>
        <span className="font-mono text-slate-400">Unit mode: {unit}</span>
      </div>
    </div>
  );
}
