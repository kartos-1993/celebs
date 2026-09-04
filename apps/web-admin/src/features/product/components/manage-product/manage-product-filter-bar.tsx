import React from 'react';
import { Search } from 'lucide-react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';

import { PRODUCT_STATUS_TABS } from '../../hooks/use-manage-product-state';
import type { PreviewStockFilter, ProductSortKey } from '../../types';

import { cn } from '@/lib/utils';

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
}) => {
  return (
    <div className="rounded-xl border border-border bg-card px-4 pt-3 shadow-sm">
      <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Status filter"
          className="no-scrollbar flex items-center gap-5 overflow-x-auto"
        >
          {PRODUCT_STATUS_TABS.map((tab) => {
            const isActive = tab.id === filterStatus;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onStatus(tab.id)}
                className={cn(
                  'shrink-0 border-b-2 pb-2 text-sm whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-56 lg:shrink-0">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

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
