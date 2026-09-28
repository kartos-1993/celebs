import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { VariantSelection } from './sku-table-types';
import { skuVariantPath } from './sku-table-utils';
import { VariantAvailability, VariantFieldInput } from './variant-field-input';

interface SkuMatrixTableProps {
  primaryVariant: VariantSelection;
  secondaryVariant: VariantSelection;
  labelOf: (axisKey: string, value: string) => string;
  isSkuLocked?: (path: string) => boolean;
}

export function SkuMatrixTable({
  primaryVariant,
  secondaryVariant,
  labelOf,
  isSkuLocked,
}: SkuMatrixTableProps) {
  return (
    <div className="rounded-md border">
      <Table className="w-full min-w-[750px] table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[10%] px-1.5 py-2">{primaryVariant.label}</TableHead>
            <TableHead className="w-[4%] px-0.5 py-2 text-center">
              {secondaryVariant.label}
            </TableHead>
            <TableHead className="w-[13%] px-1.5 py-2">
              Price <span className="ml-0.5 text-destructive">*</span>
            </TableHead>
            <TableHead className="w-[15%] px-1.5 py-2">Special Price</TableHead>
            <TableHead className="w-[10%] px-1.5 py-2">
              Stock <span className="ml-0.5 text-destructive">*</span>
            </TableHead>
            <TableHead className="w-[42%] px-1.5 py-2">SellerSKU</TableHead>
            <TableHead className="w-[6%] px-0.5 py-2 text-center" title="Availability">
              Active
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {primaryVariant.values.flatMap((opt1) =>
            secondaryVariant.values.map((opt2) => {
              const skuPath = skuVariantPath(
                primaryVariant.key,
                opt1,
                secondaryVariant.key,
                opt2,
                'sellerSku',
              );
              return (
                <TableRow key={`${opt1}-${opt2}`}>
                  <TableCell className="truncate px-1.5 py-1.5 text-xs font-medium capitalize">
                    {labelOf(primaryVariant.key, opt1)}
                  </TableCell>
                  <TableCell className="truncate px-0.5 py-1.5 text-center text-xs font-medium capitalize">
                    {labelOf(secondaryVariant.key, opt2)}
                  </TableCell>
                  {/* `align-top` pins each control to the top of its own cell, so
                      no cell can ever re-centre the inputs beside it. */}
                  <TableCell className="p-1.5 align-top">
                    <VariantFieldInput
                      name={skuVariantPath(
                        primaryVariant.key,
                        opt1,
                        secondaryVariant.key,
                        opt2,
                        'price',
                      )}
                      type="number"
                      required
                    />
                  </TableCell>
                  <TableCell className="p-1.5 align-top">
                    <VariantFieldInput
                      name={skuVariantPath(
                        primaryVariant.key,
                        opt1,
                        secondaryVariant.key,
                        opt2,
                        'specialPrice',
                      )}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="p-1.5 align-top">
                    <VariantFieldInput
                      name={skuVariantPath(
                        primaryVariant.key,
                        opt1,
                        secondaryVariant.key,
                        opt2,
                        'stock',
                      )}
                      type="number"
                      required
                    />
                  </TableCell>
                  <TableCell className="p-1.5 align-top">
                    <VariantFieldInput name={skuPath} isLocked={isSkuLocked?.(skuPath)} />
                  </TableCell>
                  <TableCell className="p-0.5 text-center">
                    <VariantAvailability
                      name={skuVariantPath(
                        primaryVariant.key,
                        opt1,
                        secondaryVariant.key,
                        opt2,
                        'available',
                      )}
                    />
                  </TableCell>
                </TableRow>
              );
            }),
          )}
        </TableBody>
      </Table>
    </div>
  );
}
