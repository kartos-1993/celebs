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

import { useFieldErrorReveal } from '../../hooks/use-submission-state';

import { FieldErrorCompact } from './shared';
import type { MeasurementChartSpec } from './use-size-measurements-state';

import { cn } from '@/lib/utils';

interface SizeMeasurementTableProps {
  chart: MeasurementChartSpec;
  selectedSizes: string[];
  unit: 'CM' | 'IN';
}

export function SizeMeasurementTable({ chart, selectedSizes, unit }: SizeMeasurementTableProps) {
  const { register, formState, control } = useFormContext();
  const listKey: 'bodyMeasurements' | 'productMeasurements' =
    chart.key === 'body' ? 'bodyMeasurements' : 'productMeasurements';
  // Gated on the CELL's own path (`sizes.0.bodyMeasurements.1.value`), so
  // typing a bust measurement never surfaces the waist complaint next to it.
  const { revealError } = useFieldErrorReveal(control);

  return (
    // The value cells below already carry their exact RHF path via `register`,
    // so every rendered cell resolves first. This anchor covers an error raised
    // on the `sizes` list itself. NOTE: form-focus' data-error-path walk only
    // matches a node strictly longer than a popped path prefix, so `sizes` can
    // never absorb a nested `sizes.0.<list>.<i>.value`; those depend on the
    // cell being rendered (inactive tab / blank column still falls back).
    <Table data-error-path="sizes" tabIndex={-1}>
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
                const cellPath = `sizes.${sizeIndex}.${listKey}.${colIndex}.value`;
                const sizesErrors = formState.errors.sizes as
                  | Record<string, Record<string, Array<{ value?: { message?: string } }>>>
                  | undefined;
                const cellError = revealError(cellPath)
                  ? sizesErrors?.[sizeIndex]?.[listKey]?.[colIndex]?.value?.message
                  : undefined;

                return (
                  // `align-top` pins each control to the top of its own cell, so
                  // no cell can re-centre the inputs beside it.
                  <TableCell key={c} className="align-top">
                    <div className="py-1">
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
                        title={cellError}
                        aria-invalid={!!cellError}
                        className={cn(
                          'h-8 text-xs',
                          cellError && 'border-destructive focus-visible:ring-destructive',
                        )}
                        {...register(`sizes.${sizeIndex}.${listKey}.${colIndex}.value` as const)}
                      />
                      {/* Out of flow on purpose: an in-flow message here made
                          every cell below it reflow. The `title` above carries
                          it for sighted hover. */}
                      <FieldErrorCompact message={cellError} />
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
