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

import { PRODUCT_STATUS_TABS } from '../../hooks/use-manage-product-state';
import type { PreviewStockFilter, ProductSortKey } from '../../types';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';

interface ManageProductFilterBarProps {
  searchInput: string;
  onSearch: (value: string) => void;
  filterStatus: string;
  onStatus: (value: string) => void;
  sortKey: ProductSortKey;
  onSortKey: (value: ProductSortKey) => void;
  vendorOptions: string[];
  vendor: string;
  onVendor: (value: string) => void;
  categoryOptions: string[];
  category: string;
  onCategory: (value: string) => void;
  stock: PreviewStockFilter;
  onStock: (value: PreviewStockFilter) => void;
  previewActive: boolean;
  onResetPreview: () => void;
  showVendorFilter?: boolean;
}

export const ManageProductFilterBar: React.FC<ManageProductFilterBarProps> = ({
  searchInput,
  onSearch,
  filterStatus,
  onStatus,
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
    <div className="rounded-xl border border-border bg-card px-3 shadow-sm">
      <FilterBar className="rounded-none border-0 bg-transparent p-0 shadow-none">
        <FilterSearch
          value={searchInput}
          onChange={onSearch}
          placeholder="Search products..."
          ariaLabel="Search products"
        />
        <SegmentedTabs
          options={PRODUCT_STATUS_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
          value={filterStatus}
          onChange={onStatus}
          ariaLabel="Product status filter"
        />
      </FilterBar>

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
              {vendorOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
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
            {categoryOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stock} onValueChange={(value) => onStock(value as typeof stock)}>
          <SelectTrigger
            className="h-8 w-[130px] rounded-full text-xs"
            aria-label="Filter by stock"
          >
            <SelectValue placeholder="Stock: Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Stock: Any</SelectItem>
            <SelectItem value="in">In stock</SelectItem>
            <SelectItem value="low">Low stock</SelectItem>
            <SelectItem value="out">Out of stock</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="outline">Preview</Badge>
        {previewActive && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onResetPreview}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
