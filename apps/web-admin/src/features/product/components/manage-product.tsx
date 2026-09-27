import React, { useMemo, useState } from 'react';

import { Permission } from '@celebs/rbac';
import type { AdminProductListItem } from '@celebs/shared-types';

import { useManageProductState } from '../hooks/use-manage-product-state';
import { useProductBatchMutations } from '../hooks/use-product-batch-mutations';
import { useProductMutations, useProductsQuery } from '../hooks/use-product-queries';

import { ManageProductContent } from './manage-product/manage-product-content';
import { ManageProductDialogs } from './manage-product/manage-product-dialogs';
import { ManageProductHeader } from './manage-product/manage-product-header';

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
  const [barcodeTarget, setBarcodeTarget] = useState<AdminProductListItem | null>(null);

  const { data, isLoading, isFetching } = useProductsQuery(state.filterParams);
  const mutations = useProductMutations();
  const batch = useProductBatchMutations();

  const products: AdminProductListItem[] = useMemo(() => data?.data?.products ?? [], [data]);
  const total = data?.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <ManageProductHeader total={total} canCreate={canCreate} />

      <ManageProductContent
        state={state}
        products={products}
        total={total}
        isLoading={isLoading}
        isFetching={isFetching}
        isSellerOrStaff={isSellerOrStaff}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        mutations={mutations}
        batch={batch}
        onPrintBarcodes={(product) => setBarcodeTarget(product)}
      />

      <ManageProductDialogs
        archiveTarget={state.archiveTarget}
        onCloseArchiveTarget={() => state.setArchiveTarget(null)}
        onConfirmArchiveTarget={() => {
          if (!state.archiveTarget?.id) return;
          mutations.archive.mutate(state.archiveTarget.id, {
            onSuccess: () => state.setArchiveTarget(null),
          });
        }}
        isArchivePending={mutations.archive.isPending}
        isBatchArchiveOpen={state.isBatchArchiveOpen}
        onCloseBatchArchive={() => state.setIsBatchArchiveOpen(false)}
        onConfirmBatchArchive={() =>
          batch.handleBatchArchiveConfirm(state.selectedProducts, () => {
            state.setSelectedProducts([]);
            state.setIsBatchArchiveOpen(false);
          })
        }
        selectedCount={state.selectedProducts.length}
        isBatchProcessing={batch.isBatchProcessing}
        barcodeTarget={barcodeTarget}
        onCloseBarcodeTarget={() => setBarcodeTarget(null)}
      />
    </div>
  );
};

export default ManageProduct;
