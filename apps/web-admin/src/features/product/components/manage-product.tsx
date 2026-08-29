import { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';

import { can, Permission } from '@celebs/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';

import { PRODUCT_STATUS_TABS, useManageProductState } from '../hooks/use-manage-product-state';
import { useProductBatchMutations } from '../hooks/use-product-batch-mutations';
import { useProductMutations, useProductsQuery } from '../hooks/use-product-queries';
import type { ProductListItem } from '../types';

import { ManageProductBatchBar } from './manage-product/manage-product-batch-bar';
import { ManageProductDialogs } from './manage-product/manage-product-dialogs';
import { ManageProductHeader } from './manage-product/manage-product-header';
import { ManageProductTable } from './manage-product/manage-product-table';

import { FilterBar, FilterSearch, SegmentedTabs } from '@/components/filter-bar';
import { useAuthContext } from '@/context/auth-provider';

const ManageProduct = () => {
  const { user } = useAuthContext();
  const userPermissions = (user as { permissions?: string[] })?.permissions;
  const isSellerOrStaff =
    user?.role === 'VENDOR' || (user?.role === 'STAFF' && Boolean(user?.vendorId));
  const canCreate = can(
    user?.role as Parameters<typeof can>[0],
    Permission.PRODUCT_CREATE,
    userPermissions,
  );
  const canEdit = can(
    user?.role as Parameters<typeof can>[0],
    Permission.PRODUCT_EDIT,
    userPermissions,
  );
  const canDelete = can(
    user?.role as Parameters<typeof can>[0],
    Permission.PRODUCT_DELETE,
    userPermissions,
  );

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

  const { selectedItems, submittableCount, activatableCount, deactivatableCount } =
    state.getSelectionCounts(products);

  return (
    <div className="space-y-6">
      <ManageProductHeader
        showHelp={state.showHelpNotification}
        onDismissHelp={() => state.setShowHelpNotification(false)}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Product List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FilterBar className="mb-4">
            <FilterSearch
              value={state.searchInput}
              onChange={(value) => {
                state.setSearchInput(value);
                state.setPage(1);
              }}
              placeholder="Search products..."
            />
            <SegmentedTabs
              options={PRODUCT_STATUS_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
              value={state.filterStatus}
              onChange={(value) => {
                state.setFilterStatus(value);
                state.setPage(1);
              }}
            />
          </FilterBar>

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
              handleBatchToggleStatus('activate', selectedItems, () =>
                state.setSelectedProducts([]),
              )
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
            products={products}
            isLoading={isLoading}
            isFetching={isFetching}
            selectedProducts={state.selectedProducts}
            onSelectAll={() => state.handleSelectAll(products)}
            onSelectProduct={state.handleSelectProduct}
            isSellerOrStaff={isSellerOrStaff}
            canCreate={canCreate}
            canEdit={canEdit}
            onSubmit={(id) => submitForReview.mutate(id)}
            isSubmitPending={submitForReview.isPending}
            onToggleActivation={(id) => toggleActivation.mutate(id)}
            isTogglePending={toggleActivation.isPending}
            onSetArchiveTarget={(target) => state.setArchiveTarget(target)}
            page={state.page}
            totalPages={totalPages}
            onPageChange={(newPage) => state.setPage(newPage)}
            searchQuery={state.debouncedSearch}
          />
        </CardContent>
      </Card>

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
