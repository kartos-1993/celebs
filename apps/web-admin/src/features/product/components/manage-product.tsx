import { useMemo } from 'react';

import { Permission } from '@celebs/rbac';

import { useManageProductState } from '../hooks/use-manage-product-state';
import { useProductBatchMutations } from '../hooks/use-product-batch-mutations';
import { useProductMutations, useProductsQuery } from '../hooks/use-product-queries';
import type { ProductListItem } from '../types';
import { uniqueCategories, uniqueVendors } from '../utils/product-table-helpers';

import { ManageProductBatchBar } from './manage-product/manage-product-batch-bar';
import { ManageProductDialogs } from './manage-product/manage-product-dialogs';
import { ManageProductFilterBar } from './manage-product/manage-product-filter-bar';
import { ManageProductHeader } from './manage-product/manage-product-header';
import { ManageProductTable } from './manage-product/manage-product-table';

import { DataTablePagination } from '@/components/data-table-pagination';
import { useAuthContext } from '@/context/auth-provider';
import { usePermission } from '@/hooks/use-permission';

export const ManageProduct: React.FC = () => {
  const { user } = useAuthContext();
  const isSellerOrStaff =
    user?.role === 'VENDOR' || (user?.role === 'STAFF' && Boolean(user?.vendorId));
  const canCreate = usePermission(Permission.PRODUCT_CREATE);
  const canEdit = usePermission(Permission.PRODUCT_EDIT);
  const canDelete = usePermission(Permission.PRODUCT_DELETE);

  const state = useManageProductState();
  const { data, isLoading, isFetching } = useProductsQuery(state.filterParams);
  const { toggleActivation, archive, submitForReview } = useProductMutations();
  const {
    isBatchProcessing,
    handleBatchSubmit,
    handleBatchToggleStatus,
    handleBatchArchiveConfirm,
  } = useProductBatchMutations();

  const products: ProductListItem[] = useMemo(() => data?.data?.products ?? [], [data]);
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / state.pageSize) || 1;

  const vendorOptions = useMemo(() => uniqueVendors(products), [products]);
  const categoryOptions = useMemo(() => uniqueCategories(products), [products]);
  const visibleProducts = useMemo(() => state.applyPreview(products), [products, state]);

  const { selectedItems, submittableCount, activatableCount, deactivatableCount } =
    state.getSelectionCounts(visibleProducts);

  return (
    <div className="space-y-6">
      <ManageProductHeader total={total} canCreate={canCreate} />

      <div className="space-y-4">
        <ManageProductFilterBar
          searchInput={state.searchInput}
          onSearch={(value) => {
            state.setSearchInput(value);
            state.setPage(1);
          }}
          filterStatus={state.filterStatus}
          onStatus={(value) => {
            state.setFilterStatus(value);
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
          isBatchProcessing={isBatchProcessing}
          onSubmit={() => handleBatchSubmit(selectedItems, () => state.setSelectedProducts([]))}
          onActivate={() =>
            handleBatchToggleStatus('activate', selectedItems, () => state.setSelectedProducts([]))
          }
          onDeactivate={() =>
            handleBatchToggleStatus('deactivate', selectedItems, () =>
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
          onSubmit={(id) => submitForReview.mutate(id)}
          isSubmitPending={submitForReview.isPending}
          onToggleActivation={(id) => toggleActivation.mutate(id)}
          isTogglePending={toggleActivation.isPending}
          onSetArchiveTarget={(target) => state.setArchiveTarget(target)}
          searchQuery={state.debouncedSearch}
        />

        <DataTablePagination
          page={state.page}
          totalPages={totalPages}
          total={total}
          pageSize={state.pageSize}
          onPageChange={(newPage) => state.setPage(newPage)}
          onPageSizeChange={state.setPageSize}
        />
      </div>

      <ManageProductDialogs
        archiveTarget={state.archiveTarget}
        onCloseArchiveTarget={() => state.setArchiveTarget(null)}
        onConfirmArchiveTarget={() => {
          if (!state.archiveTarget?.id) return;
          archive.mutate(state.archiveTarget.id, { onSuccess: () => state.setArchiveTarget(null) });
        }}
        isArchivePending={archive.isPending}
        isBatchArchiveOpen={state.isBatchArchiveOpen}
        onCloseBatchArchive={() => state.setIsBatchArchiveOpen(false)}
        onConfirmBatchArchive={() =>
          handleBatchArchiveConfirm(state.selectedProducts, () => {
            state.setSelectedProducts([]);
            state.setIsBatchArchiveOpen(false);
          })
        }
        selectedCount={state.selectedProducts.length}
        isBatchProcessing={isBatchProcessing}
      />
    </div>
  );
};

export default ManageProduct;
