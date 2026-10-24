import React from 'react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import type { PreviewStockFilter, ProductSortKey } from '../../types';
import type { FilterSelectOption } from '../../utils/product-table-helpers';

export interface ManageProductFilterSelectsProps {
  sortKey: ProductSortKey;
  onSortKey: (value: ProductSortKey) => void;
  vendorOptions: Array<FilterSelectOption | string>;
  vendor: string;
  onVendor: (value: string) => void;
  categoryOptions: Array<FilterSelectOption | string>;
  category: string;
  onCategory: (value: string) => void;
  stock: PreviewStockFilter;
  onStock: (value: PreviewStockFilter) => void;
  previewActive: boolean;
  onResetPreview: () => void;
  showVendorFilter?: boolean;
}

function normalizeOption(option: FilterSelectOption | string): FilterSelectOption {
  return typeof option === 'string' ? { id: option, label: option } : option;
}

export const ManageProductFilterSelects: React.FC<ManageProductFilterSelectsProps> = ({
  sortKey,
  onSortKey,
  vendorOptions,
  vendor,
  onVendor,
  categoryOptions,
  category,
  onCategory,
  stock,
  onStock,
  previewActive,
  onResetPreview,
  showVendorFilter = true,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Sort by
      </span>
      <Select value={sortKey} onValueChange={(value) => onSortKey(value as ProductSortKey)}>
        <SelectTrigger className="h-8 w-[140px] rounded-full text-xs" aria-label="Sort products">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="price-asc">Price: Low to High</SelectItem>
          <SelectItem value="price-desc">Price: High to Low</SelectItem>
          <SelectItem value="name-asc">Name: A to Z</SelectItem>
        </SelectContent>
      </Select>

      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Filter
      </span>
      {showVendorFilter && (
        <Select value={vendor} onValueChange={onVendor}>
          <SelectTrigger
            className="h-8 w-[140px] rounded-full text-xs"
            aria-label="Filter by vendor"
          >
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendorOptions.map((opt) => {
              const item = normalizeOption(opt);
              return (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      <Select value={category} onValueChange={onCategory}>
        <SelectTrigger
          className="h-8 w-[140px] rounded-full text-xs"
          aria-label="Filter by category"
        >
          <SelectValue placeholder="Category: Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Category: Any</SelectItem>
          {categoryOptions.map((opt) => {
            const item = normalizeOption(opt);
            return (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={stock} onValueChange={(value) => onStock(value as PreviewStockFilter)}>
        <SelectTrigger className="h-8 w-[130px] rounded-full text-xs" aria-label="Filter by stock">
          <SelectValue placeholder="Stock: Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Stock: Any</SelectItem>
          <SelectItem value="in-stock">In stock</SelectItem>
          <SelectItem value="out-of-stock">Out of stock</SelectItem>
        </SelectContent>
      </Select>

      {previewActive && (
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Filter active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetPreview}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Reset
          </Button>
        </div>
      )}
    </div>
  );
};
