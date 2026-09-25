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
import { pathFor } from './sku-table-utils';
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
    <div className="border rounded-md overflow-x-auto">
      <Table className="w-full min-w-[750px] table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[10%] px-1.5 py-2">{primaryVariant.label}</TableHead>
            <TableHead className="w-[4%] px-0.5 py-2 text-center">
              {secondaryVariant.label}
            </TableHead>
            <TableHead className="w-[13%] px-1.5 py-2">
              Price <span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-[15%] px-1.5 py-2">Special Price</TableHead>
            <TableHead className="w-[10%] px-1.5 py-2">
              Stock <span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-[31%] px-1.5 py-2">SellerSKU</TableHead>
            <TableHead className="w-[11%] px-1 py-2">Free</TableHead>
            <TableHead className="w-[6%] px-0.5 py-2 text-center" title="Availability">
              Active
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {primaryVariant.values.flatMap((opt1) =>
            secondaryVariant.values.map((opt2) => {
              const skuPath = pathFor(
                primaryVariant.key,
                opt1,
                secondaryVariant.key,
                opt2,
                'sellerSku',
              );
              return (
                <TableRow key={`${opt1}-${opt2}`}>
                  <TableCell className="capitalize font-medium text-xs px-1.5 py-1.5 truncate">
                    {labelOf(primaryVariant.key, opt1)}
                  </TableCell>
                  <TableCell className="capitalize font-medium text-xs px-0.5 py-1.5 text-center truncate">
                    {labelOf(secondaryVariant.key, opt2)}
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(primaryVariant.key, opt1, secondaryVariant.key, opt2, 'price')}
                      type="number"
                      required
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(
                        primaryVariant.key,
                        opt1,
                        secondaryVariant.key,
                        opt2,
                        'specialPrice',
                      )}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(primaryVariant.key, opt1, secondaryVariant.key, opt2, 'stock')}
                      type="number"
                      required
                    />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput name={skuPath} isLocked={isSkuLocked?.(skuPath)} />
                  </TableCell>
                  <TableCell className="p-1.5">
                    <VariantFieldInput
                      name={pathFor(
                        primaryVariant.key,
                        opt1,
                        secondaryVariant.key,
                        opt2,
                        'freeItems',
                      )}
                      type="number"
                    />
                  </TableCell>
                  <TableCell className="p-0.5 text-center">
                    <VariantAvailability
                      name={pathFor(
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
