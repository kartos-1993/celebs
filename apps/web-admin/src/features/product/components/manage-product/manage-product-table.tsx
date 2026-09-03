import React from 'react';
import { ShoppingBag } from 'lucide-react';

import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { EmptyState } from '@celebs/shared-ui/components/empty-state';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@celebs/shared-ui/components/table';

import type { ProductListItem } from '../../types';

import { ManageProductCards } from './manage-product-cards';
import { ManageProductPagination } from './manage-product-pagination';
import { ManageProductTableRow } from './manage-product-table-row';

interface ManageProductTableProps {
  products: ProductListItem[];
  isLoading: boolean;
  isFetching: boolean;
  selectedProducts: string[];
  onSelectAll: () => void;
  onSelectProduct: (id: string, checked: boolean) => void;
  isSellerOrStaff: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onSubmit: (id: string) => void;
  isSubmitPending: boolean;
  onToggleActivation: (id: string) => void;
  isTogglePending: boolean;
  onSetArchiveTarget: (product: ProductListItem) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchQuery: string;
}

export const ManageProductTable: React.FC<ManageProductTableProps> = ({
  products,
  isLoading,
  isFetching,
  selectedProducts,
  onSelectAll,
  onSelectProduct,
  isSellerOrStaff,
  canCreate,
  canEdit,
  onSubmit,
  isSubmitPending,
  onToggleActivation,
  isTogglePending,
  onSetArchiveTarget,
  page,
  totalPages,
  onPageChange,
  searchQuery,
}) => {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Loading products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-8 w-8" />}
        title="No products found"
        description={
          searchQuery
            ? `Nothing matches "${searchQuery}". Try a different search or status filter.`
            : 'Try a different status filter, or create your first product.'
        }
      />
    );
  }

  return (
    <div
      className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : 'transition-opacity'}
    >
      <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <TableHead>Product Info</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <ManageProductTableRow
                key={product.id}
                product={product}
                isSelected={Boolean(product.id && selectedProducts.includes(product.id))}
                onSelect={(checked) => product.id && onSelectProduct(product.id, checked)}
                isSellerOrStaff={isSellerOrStaff}
                canCreate={canCreate}
                canEdit={canEdit}
                onSubmit={onSubmit}
                isSubmitPending={isSubmitPending}
                onToggleActivation={onToggleActivation}
                isTogglePending={isTogglePending}
                onSetArchiveTarget={onSetArchiveTarget}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <ManageProductCards
        products={products}
        isLoading={false}
        isFetching={isFetching && !isLoading}
        selectedProducts={selectedProducts}
        onSelectProduct={onSelectProduct}
        isSellerOrStaff={isSellerOrStaff}
        canCreate={canCreate}
        canEdit={canEdit}
        onSubmit={onSubmit}
        isSubmitPending={isSubmitPending}
        onToggleActivation={onToggleActivation}
        isTogglePending={isTogglePending}
        onSetArchiveTarget={onSetArchiveTarget}
        searchQuery={searchQuery}
      />

      <ManageProductPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};
