import React from 'react';

import { PRODUCT_STATUS_TABS } from '../../hooks/use-manage-product-state';
import type { PreviewStockFilter, ProductSortKey } from '../../types';
import type { FilterSelectOption } from '../../utils/product-table-helpers';

import { ManageProductFilterSelects } from './manage-product-filter-selects';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';

interface ManageProductFilterBarProps {
  searchInput: string;
  onSearch: (value: string) => void;
  filterStatus: string;
  onStatus: (value: string) => void;
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

      <ManageProductFilterSelects
        sortKey={sortKey}
        onSortKey={onSortKey}
        vendorOptions={vendorOptions}
        vendor={vendor}
        onVendor={onVendor}
        categoryOptions={categoryOptions}
        category={category}
        onCategory={onCategory}
        stock={stock}
        onStock={onStock}
        previewActive={previewActive}
        onResetPreview={onResetPreview}
        showVendorFilter={showVendorFilter}
      />
    </div>
  );
};
