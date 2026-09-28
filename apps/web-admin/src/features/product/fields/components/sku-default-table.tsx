import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import { VariantAvailability, VariantFieldInput } from './variant-field-input';

interface SkuDefaultTableProps {
  isSkuLocked?: (path: string) => boolean;
}

export function SkuDefaultTable({ isSkuLocked }: SkuDefaultTableProps) {
  return (
    // No `overflow-x-auto` here: `Table` already wraps itself in
    // `relative w-full overflow-auto`, so a second scroller nested inside is
    // redundant (and gives the sticky/scroll layering a second owner).
    <div className="mb-4 rounded-md border">
      <Table className="w-full min-w-[650px] table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[15%] px-1.5 py-2">
              Price <span className="ml-0.5 text-destructive">*</span>
            </TableHead>
            <TableHead className="w-[18%] px-1.5 py-2">Special Price</TableHead>
            <TableHead className="w-[12%] px-1.5 py-2">
              Stock <span className="ml-0.5 text-destructive">*</span>
            </TableHead>
            <TableHead className="w-[42%] px-1.5 py-2">SellerSKU</TableHead>
            <TableHead className="w-[13%] px-1.5 py-2">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {/* `align-top` pins each control to the top of its own cell, so no
                cell can ever re-centre the inputs beside it. */}
            <TableCell className="p-1.5 align-top">
              <VariantFieldInput name="sku.default.price" type="number" required />
            </TableCell>
            <TableCell className="p-1.5 align-top">
              <VariantFieldInput name="sku.default.specialPrice" type="number" />
            </TableCell>
            <TableCell className="p-1.5 align-top">
              <VariantFieldInput name="sku.default.stock" type="number" required />
            </TableCell>
            <TableCell className="p-1.5 align-top">
              <VariantFieldInput
                name="sku.default.sellerSku"
                isLocked={isSkuLocked?.('sku.default.sellerSku')}
              />
            </TableCell>
            <TableCell className="p-1.5">
              <VariantAvailability name="sku.default.available" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
