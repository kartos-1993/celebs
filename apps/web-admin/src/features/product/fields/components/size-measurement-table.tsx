import React from 'react';
import { useFormContext } from 'react-hook-form';

import { Input } from '@celebs/shared-ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { MeasurementChartSpec } from './use-size-measurements-state';

import { cn } from '@/lib/utils';

interface SizeMeasurementTableProps {
  chart: MeasurementChartSpec;
  selectedSizes: string[];
  unit: 'CM' | 'IN';
}

export function SizeMeasurementTable({ chart, selectedSizes, unit }: SizeMeasurementTableProps) {
  const { register, formState } = useFormContext();
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
}
