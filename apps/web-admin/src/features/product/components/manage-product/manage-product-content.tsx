import React, { useMemo } from 'react';

import type { AdminProductListItem } from '@celebs/shared-types';

import type { useManageProductState } from '../../hooks/use-manage-product-state';
import type { useProductBatchMutations } from '../../hooks/use-product-batch-mutations';
import {
  useProductCategoriesQuery,
  type useProductMutations,
  useProductVendorsQuery,
} from '../../hooks/use-product-queries';
import { formatCategoryOptions, formatVendorOptions } from '../../utils/product-table-helpers';

import { ManageProductBatchBar } from './manage-product-batch-bar';
import { ManageProductFilterBar } from './manage-product-filter-bar';
import { ManageProductTable } from './manage-product-table';

import { DataTablePagination } from '@/components/data-table-pagination';

interface ManageProductContentProps {
  state: ReturnType<typeof useManageProductState>;
  products: AdminProductListItem[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  mutations: ReturnType<typeof useProductMutations>;
  batch: ReturnType<typeof useProductBatchMutations>;
  onPrintBarcodes: (product: AdminProductListItem) => void;
}

export const ManageProductContent: React.FC<ManageProductContentProps> = ({
  state,
  products,
  total,
  isLoading,
  isFetching,
  isSellerOrStaff,
  canCreate,
  canEdit,
  canDelete,
  mutations,
  batch,
  onPrintBarcodes,
}) => {
  const { data: vendorsData } = useProductVendorsQuery(!isSellerOrStaff);
  const { data: categoriesData } = useProductCategoriesQuery();

  const vendorOptions = useMemo(
    () => formatVendorOptions(vendorsData?.data, products),
    [vendorsData, products],
  );
  const categoryOptions = useMemo(
    () => formatCategoryOptions(categoriesData?.data, products),
    [categoriesData, products],
  );
  const visibleProducts = useMemo(() => state.applyPreview(products), [products, state]);

  const { selectedItems, submittableCount, activatableCount, deactivatableCount } =
    state.getSelectionCounts(visibleProducts);
  const totalPages = Math.ceil(total / state.pageSize) || 1;

  return (
    <div className="space-y-4">
      <ManageProductFilterBar
        searchInput={state.searchInput}
        onSearch={(val) => {
          state.setSearchInput(val);
          state.setPage(1);
        }}
        filterStatus={state.filterStatus}
        onStatus={(val) => {
          state.setFilterStatus(val);
          state.setPage(1);
        }}
        sortKey={state.sortKey}
        onSortKey={state.setSortKey}
        vendorOptions={vendorOptions}
        vendor={state.previewVendor}
        onVendor={state.setPreviewVendor}
        categoryOptions={categoryOptions}
        category={state.previewCategory}
        onCategory={state.setPreviewCategory}
        stock={state.previewStock}
        onStock={state.setPreviewStock}
        previewActive={state.previewActive}
        onResetPreview={state.resetPreviewFilters}
        showVendorFilter={!isSellerOrStaff}
      />

      <ManageProductBatchBar
        selectedCount={state.selectedProducts.length}
        submittableCount={submittableCount}
        activatableCount={activatableCount}
        deactivatableCount={deactivatableCount}
        isSellerOrStaff={isSellerOrStaff}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        isBatchProcessing={batch.isBatchProcessing}
        onSubmit={() => batch.handleBatchSubmit(selectedItems, () => state.setSelectedProducts([]))}
        onActivate={() =>
          batch.handleBatchToggleStatus('activate', selectedItems, () =>
            state.setSelectedProducts([]),
          )
        }
        onDeactivate={() =>
          batch.handleBatchToggleStatus('deactivate', selectedItems, () =>
            state.setSelectedProducts([]),
          )
        }
        onOpenArchive={() => state.setIsBatchArchiveOpen(true)}
        onClear={() => state.setSelectedProducts([])}
      />

      <ManageProductTable
        products={visibleProducts}
        isLoading={isLoading}
        isFetching={isFetching}
        selectedProducts={state.selectedProducts}
        onSelectAll={() => state.handleSelectAll(visibleProducts)}
        onSelectProduct={state.handleSelectProduct}
        isSellerOrStaff={isSellerOrStaff}
        canCreate={canCreate}
        canEdit={canEdit}
        onSubmit={(id) => mutations.submitForReview.mutate(id)}
        isSubmitPending={mutations.submitForReview.isPending}
        onToggleActivation={(id) => mutations.toggleActivation.mutate(id)}
        isTogglePending={mutations.toggleActivation.isPending}
        onSetArchiveTarget={state.setArchiveTarget}
        onPrintBarcodes={onPrintBarcodes}
        searchQuery={state.debouncedSearch}
      />

      <DataTablePagination
        page={state.page}
        totalPages={totalPages}
        total={total}
        pageSize={state.pageSize}
        onPageChange={state.setPage}
        onPageSizeChange={state.setPageSize}
      />
    </div>
  );
};
