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

export function SkuDefaultTable() {
  return (
    <div className="border rounded-md overflow-x-auto mb-4">
      <Table className="w-full min-w-[650px] table-fixed text-xs">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[15%] px-1.5 py-2">
              Price <span className="text-destructive ml-0.5">*</span>
            </TableHead>
            <TableHead className="w-[18%] px-1.5 py-2">Special Price</TableHead>
            <TableHead className="w-[12%] px-1.5 py-2">Stock</TableHead>
            <TableHead className="w-[30%] px-1.5 py-2">SellerSKU</TableHead>
            <TableHead className="w-[12%] px-1.5 py-2">Free</TableHead>
            <TableHead className="w-[13%] px-1.5 py-2">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="p-1.5">
              <VariantFieldInput name="sku.default.price" type="number" required />
            </TableCell>
            <TableCell className="p-1.5">
              <VariantFieldInput name="sku.default.specialPrice" type="number" />
            </TableCell>
            <TableCell className="p-1.5">
              <VariantFieldInput name="sku.default.stock" type="number" />
            </TableCell>
            <TableCell className="p-1.5">
              <VariantFieldInput name="sku.default.sellerSku" />
            </TableCell>
            <TableCell className="p-1.5">
              <VariantFieldInput name="sku.default.freeItems" type="number" />
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
