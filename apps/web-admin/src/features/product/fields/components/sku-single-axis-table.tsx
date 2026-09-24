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

interface SkuSingleAxisTableProps {
  variant: VariantSelection;
  labelOf: (axisKey: string, value: string) => string;
}

export function SkuSingleAxisTable({ variant, labelOf }: SkuSingleAxisTableProps) {
  return (
    <div className="border rounded-md overflow-x-auto">
      <Table className="w-full min-w-[700px] table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[12%] px-1.5 py-2">{variant.label}</TableHead>
            <TableHead className="w-[14%] px-1.5 py-2">
              Price <span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-[16%] px-1.5 py-2">Special Price</TableHead>
            <TableHead className="w-[11%] px-1.5 py-2">
              Stock <span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-[28%] px-1.5 py-2">SellerSKU</TableHead>
            <TableHead className="w-[10%] px-1.5 py-2">Free</TableHead>
            <TableHead className="w-[9%] px-1 py-2 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variant.values.map((opt) => (
            <TableRow key={opt}>
              <TableCell className="capitalize font-medium text-xs px-1.5 py-1.5 truncate">
                {labelOf(variant.key, opt)}
              </TableCell>
              <TableCell className="p-1.5">
                <VariantFieldInput
                  name={pathFor(variant.key, opt, 'price')}
                  type="number"
                  required
                />
              </TableCell>
              <TableCell className="p-1.5">
                <VariantFieldInput name={pathFor(variant.key, opt, 'specialPrice')} type="number" />
              </TableCell>
              <TableCell className="p-1.5">
                <VariantFieldInput
                  name={pathFor(variant.key, opt, 'stock')}
                  type="number"
                  required
                />
              </TableCell>
              <TableCell className="p-1.5">
                <VariantFieldInput name={pathFor(variant.key, opt, 'sellerSku')} />
              </TableCell>
              <TableCell className="p-1.5">
                <VariantFieldInput name={pathFor(variant.key, opt, 'freeItems')} type="number" />
              </TableCell>
              <TableCell className="p-1 text-center">
                <VariantAvailability name={pathFor(variant.key, opt, 'available')} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
