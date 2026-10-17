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

interface SkuSingleAxisTableProps {
  variant: VariantSelection;
  labelOf: (axisKey: string, value: string) => string;
  isSkuLocked?: (path: string) => boolean;
}

export function SkuSingleAxisTable({ variant, labelOf, isSkuLocked }: SkuSingleAxisTableProps) {
  return (
    <div className="rounded-md border">
      <Table className="w-full min-w-[700px] table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[12%] px-1.5 py-2">{variant.label}</TableHead>
            <TableHead className="w-[14%] px-1.5 py-2">
              Price <span className="ml-0.5 text-destructive">*</span>
            </TableHead>
            <TableHead className="w-[16%] px-1.5 py-2">Special Price</TableHead>
            <TableHead className="w-[11%] px-1.5 py-2">
              Stock <span className="ml-0.5 text-destructive">*</span>
            </TableHead>
            <TableHead className="w-[38%] px-1.5 py-2">SellerSKU</TableHead>
            <TableHead className="w-[9%] px-1 py-2 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variant.values.map((opt) => (
            <TableRow key={opt}>
              <TableCell className="truncate px-1.5 py-1.5 text-xs font-medium capitalize">
                {labelOf(variant.key, opt)}
              </TableCell>
              {/* `align-top` pins each control to the top of its own cell, so no
                  cell can ever re-centre the inputs beside it. */}
              <TableCell className="p-1.5 align-top">
                <VariantFieldInput
                  name={skuVariantPath(variant.key, opt, 'price')}
                  type="number"
                  required
                />
              </TableCell>
              <TableCell className="p-1.5 align-top">
                <VariantFieldInput
                  name={skuVariantPath(variant.key, opt, 'specialPrice')}
                  type="number"
                />
              </TableCell>
              <TableCell className="p-1.5 align-top">
                <VariantFieldInput
                  name={skuVariantPath(variant.key, opt, 'stock')}
                  type="number"
                  required
                />
              </TableCell>
              <TableCell className="p-1.5 align-top">
                <VariantFieldInput
                  name={skuVariantPath(variant.key, opt, 'sellerSku')}
                  isLocked={isSkuLocked?.(skuVariantPath(variant.key, opt, 'sellerSku'))}
                />
              </TableCell>
              <TableCell className="p-1 text-center">
                <VariantAvailability name={skuVariantPath(variant.key, opt, 'available')} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
